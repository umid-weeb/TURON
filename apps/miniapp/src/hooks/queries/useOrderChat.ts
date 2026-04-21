import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';
import { ORDER_TRACKING_FEATURE_ENABLED } from '../../features/tracking/config';

export interface ChatMessage {
  id: string;
  orderId: string;
  senderId: string;
  senderRole: 'COURIER' | 'CUSTOMER' | 'ADMIN';
  senderName: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  /** Only on optimistic messages while waiting for server confirmation */
  _status?: 'sending' | 'sent' | 'error';
}

interface ChatReadPayload {
  orderId: string;
  readerRole: 'COURIER' | 'CUSTOMER' | 'ADMIN';
  readAt: string;
}

interface ChatUnreadReminderPayload {
  orderId: string;
  forRole: 'COURIER' | 'CUSTOMER' | 'ADMIN';
  messageId: string;
}

interface ChatStreamEvent {
  type: string;
  orderId?: string;
  chatMessage?: ChatMessage;
  chatRead?: ChatReadPayload;
  chatUnreadReminder?: ChatUnreadReminderPayload;
}

function chatKey(orderId: string) {
  return ['order-chat', orderId] as const;
}

/** Fetch existing messages for an order */
function fetchMessages(orderId: string, role: 'courier' | 'customer'): Promise<ChatMessage[]> {
  const path = role === 'courier' ? `/courier/order/${orderId}/chat` : `/orders/${orderId}/chat`;
  return api.get(path) as Promise<ChatMessage[]>;
}

/** Send a message */
function postMessage(
  orderId: string,
  role: 'courier' | 'customer',
  content: string,
): Promise<ChatMessage> {
  const path = role === 'courier' ? `/courier/order/${orderId}/chat` : `/orders/${orderId}/chat`;
  return api.post(path, { content }) as Promise<ChatMessage>;
}

/** Fetch unread count */
export function useOrderChatUnread(orderId: string, role: 'courier' | 'customer') {
  return useQuery({
    queryKey: ['order-chat-unread', orderId, role],
    queryFn: async () => {
      const path =
        role === 'courier'
          ? `/courier/order/${orderId}/chat/unread`
          : `/orders/${orderId}/chat/unread`;
      const res = (await api.get(path)) as { count: number };
      return res.count;
    },
    refetchInterval: 20_000,
    enabled: Boolean(orderId),
  });
}

/**
 * Full chat hook — fetches messages, handles SSE real-time delivery, and exposes send mutation.
 *
 * The hook attaches to the order's existing tracking SSE stream at
 * `/orders/:id/tracking/stream` (customer) or inlines the same stream.
 * When a `chat.message` event arrives it appends the message to the query cache
 * without a re-fetch. Falls back to polling every 15s if SSE is unavailable.
 */
export function useOrderChat(
  orderId: string,
  role: 'courier' | 'customer',
  callbacks?: {
    onUnreadReminder?: (messageId: string) => void;
  },
) {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  const [connected, setConnected] = useState(false);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  // ── Initial fetch ─────────────────────────────────────────────────────────
  const { data: messages = [], isLoading, error } = useQuery({
    queryKey: chatKey(orderId),
    queryFn: () => fetchMessages(orderId, role),
    enabled: Boolean(orderId),
    staleTime: 5_000,
    refetchInterval: connected ? false : 15_000, // Poll when SSE not connected
  });

  // ── Append message to cache helper ───────────────────────────────────────
  const appendMessage = useCallback(
    (msg: ChatMessage) => {
      queryClient.setQueryData<ChatMessage[]>(chatKey(orderId), (prev) => {
        if (!prev) return [msg];
        if (prev.some((m) => m.id === msg.id)) return prev; // deduplicate
        return [...prev, msg];
      });
      // Invalidate unread count for the other side
      queryClient.invalidateQueries({ queryKey: ['order-chat-unread', orderId] });
    },
    [queryClient, orderId],
  );

  // ── SSE listener — piggyback on order tracking stream ────────────────────
  const disposeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!ORDER_TRACKING_FEATURE_ENABLED || !orderId || !token) {
      setConnected(false);
      return;
    }

    // Use the tracking stream URL — the backend now also emits chat.message on it
    const streamUrl = role === 'courier'
      ? `${api.defaults.baseURL}/orders/${orderId}/tracking/stream`
      : `${api.defaults.baseURL}/orders/${orderId}/tracking/stream`;

    let isDisposed = false;
    const abortController = new AbortController();
    let reconnectTimer: number | null = null;

    const connect = async () => {
      try {
        const response = await fetch(streamUrl, {
          method: 'GET',
          headers: { Accept: 'text/event-stream', Authorization: `Bearer ${token}` },
          signal: abortController.signal,
        });

        if (!response.ok || !response.body) throw new Error('stream failed');

        setConnected(true);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!isDisposed) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          let boundary = buffer.indexOf('\n\n');
          while (boundary >= 0) {
            const chunk = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            boundary = buffer.indexOf('\n\n');

            const dataLines = chunk
              .split('\n')
              .filter((l) => l.startsWith('data:'))
              .map((l) => l.slice(5).trimStart());

            if (!dataLines.length) continue;

            try {
              const payload = JSON.parse(dataLines.join('\n')) as ChatStreamEvent;

              if (payload.type === 'chat.message' && payload.chatMessage) {
                appendMessage(payload.chatMessage);
              }

              // Update isRead flag on our own messages when the other party reads them
              if (payload.type === 'chat.read' && payload.chatRead) {
                const { readerRole } = payload.chatRead;
                // My messages are read by the other role
                const myRole = role === 'courier' ? 'COURIER' : 'CUSTOMER';
                const otherRole = myRole === 'COURIER' ? 'CUSTOMER' : 'COURIER';
                if (readerRole === otherRole) {
                  queryClient.setQueryData<ChatMessage[]>(chatKey(orderId), (prev) =>
                    prev
                      ? prev.map((m) =>
                          m.senderRole === myRole ? { ...m, isRead: true } : m,
                        )
                      : prev,
                  );
                }
              }

              // Unread reminder: backend says the recipient hasn't opened chat in 60 s
              if (payload.type === 'chat.unread_reminder' && payload.chatUnreadReminder) {
                const myRole = role === 'courier' ? 'COURIER' : 'CUSTOMER';
                if (payload.chatUnreadReminder.forRole === myRole) {
                  callbacksRef.current?.onUnreadReminder?.(payload.chatUnreadReminder.messageId);
                }
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      } catch {
        // ignore abort errors
      }

      if (!isDisposed) {
        setConnected(false);
        reconnectTimer = window.setTimeout(() => {
          reconnectTimer = null;
          void connect();
        }, 4000);
      }
    };

    void connect();

    disposeRef.current = () => {
      isDisposed = true;
      abortController.abort();
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
    };

    return () => {
      disposeRef.current?.();
      disposeRef.current = null;
    };
  }, [orderId, token, role, appendMessage]);

  // ── Send mutation with optimistic update ──────────────────────────────────
  const userId = useAuthStore((s) => s.user?.id ?? '');
  const userName = useAuthStore((s) => s.user?.fullName ?? '');
  const senderRole: ChatMessage['senderRole'] = role === 'courier' ? 'COURIER' : 'CUSTOMER';

  const sendMutation = useMutation({
    mutationFn: (content: string) => postMessage(orderId, role, content),

    onMutate: (content: string) => {
      const tempId = `optimistic-${Date.now()}-${Math.random()}`;
      const optimistic: ChatMessage = {
        id: tempId,
        orderId,
        senderId: userId,
        senderRole,
        senderName: userName,
        content,
        isRead: false,
        createdAt: new Date().toISOString(),
        _status: 'sending',
      };
      queryClient.setQueryData<ChatMessage[]>(chatKey(orderId), (prev) =>
        prev ? [...prev, optimistic] : [optimistic],
      );
      return { tempId };
    },

    onSuccess: (msg, _content, context) => {
      // Replace temp message with confirmed server message
      queryClient.setQueryData<ChatMessage[]>(chatKey(orderId), (prev) => {
        if (!prev) return [{ ...msg, _status: 'sent' as const }];
        // Remove temp, add real (appendMessage handles dedup for SSE echo)
        const without = prev.filter((m) => m.id !== context?.tempId);
        if (without.some((m) => m.id === msg.id)) return without; // SSE already added it
        return [...without, { ...msg, _status: 'sent' as const }];
      });
      queryClient.invalidateQueries({ queryKey: ['order-chat-unread', orderId] });
    },

    onError: (_err, _content, context) => {
      // Remove the failed optimistic message
      if (context?.tempId) {
        queryClient.setQueryData<ChatMessage[]>(chatKey(orderId), (prev) =>
          prev ? prev.filter((m) => m.id !== context.tempId) : prev,
        );
      }
    },
  });

  return {
    messages,
    isLoading,
    error,
    sendMessage: (content: string) => sendMutation.mutateAsync(content),
    isSending: sendMutation.isPending,
    connected,
  };
}
