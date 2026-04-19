import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';

export interface AdminChatEntry {
  orderId: string;
  orderNumber: string;
  unreadCount: number;
  lastMessage: string;
  lastAt: string;
}

export interface AdminInbox {
  courierMessages: AdminChatEntry[];
  customerMessages: AdminChatEntry[];
}

export interface AdminChatMessage {
  id: string;
  orderId: string;
  senderId: string;
  senderRole: 'COURIER' | 'CUSTOMER' | 'ADMIN';
  senderName: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

/** Fetch admin inbox (orders with unread messages from couriers/customers) */
export function useAdminInbox() {
  return useQuery({
    queryKey: ['admin-inbox'],
    queryFn: () => api.get('/orders/chats') as Promise<AdminInbox>,
    refetchInterval: 15_000,
    staleTime: 5_000,
  });
}

/** Fetch messages for one order (admin view) — marks all as read on load */
export function useAdminOrderChat(orderId: string) {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  const [connected, setConnected] = useState(false);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['admin-order-chat', orderId],
    queryFn: () => api.get(`/orders/${orderId}/admin-chat`) as Promise<AdminChatMessage[]>,
    enabled: Boolean(orderId),
    staleTime: 5_000,
    refetchInterval: connected ? false : 10_000,
  });

  // Invalidate inbox unread counts when we load messages (since they were just marked read)
  useEffect(() => {
    if (orderId) {
      queryClient.invalidateQueries({ queryKey: ['admin-inbox'] });
    }
  }, [orderId, queryClient]);

  // Append via SSE
  const appendMessage = useCallback(
    (msg: AdminChatMessage) => {
      queryClient.setQueryData<AdminChatMessage[]>(['admin-order-chat', orderId], (prev) => {
        if (!prev) return [msg];
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      queryClient.invalidateQueries({ queryKey: ['admin-inbox'] });
    },
    [queryClient, orderId],
  );

  // SSE listener — piggyback on order tracking stream
  const disposeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!orderId || !token) { setConnected(false); return; }

    const streamUrl = `${(api.defaults as any).baseURL}/orders/${orderId}/tracking/stream`;
    let isDisposed = false;
    const abortController = new AbortController();
    let reconnectTimer: number | null = null;

    const connect = async () => {
      try {
        const response = await fetch(streamUrl, {
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
              const payload = JSON.parse(dataLines.join('\n'));
              if (payload.type === 'chat.message' && payload.chatMessage) {
                appendMessage(payload.chatMessage as AdminChatMessage);
              }
            } catch { /* ignore */ }
          }
        }
      } catch { /* ignore abort */ }

      if (!isDisposed) {
        setConnected(false);
        reconnectTimer = window.setTimeout(() => { reconnectTimer = null; void connect(); }, 4000);
      }
    };

    void connect();
    disposeRef.current = () => {
      isDisposed = true;
      abortController.abort();
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
    };
    return () => { disposeRef.current?.(); disposeRef.current = null; };
  }, [orderId, token, appendMessage]);

  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      api.post(`/orders/${orderId}/admin-chat`, { content }) as Promise<AdminChatMessage>,
    onSuccess: (msg) => appendMessage(msg),
  });

  return { messages, isLoading, connected, sendMessage: (c: string) => sendMutation.mutateAsync(c), isSending: sendMutation.isPending };
}

/** Total unread count across all orders (for dashboard badge) */
export function useAdminUnreadTotal() {
  return useQuery({
    queryKey: ['admin-inbox'],
    queryFn: () => api.get('/orders/chats') as Promise<AdminInbox>,
    select: (data) =>
      [...data.courierMessages, ...data.customerMessages].reduce((sum, e) => sum + e.unreadCount, 0),
    refetchInterval: 15_000,
    staleTime: 5_000,
  });
}
