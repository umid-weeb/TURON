import { useCallback, useEffect, useRef } from 'react';
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
  /** Only set on ADMIN messages — which party it's directed to. null = all. */
  targetRole: 'COURIER' | 'CUSTOMER' | null;
  /** Optimistic-only: tracks in-flight send state */
  _status?: 'sending' | 'sent' | 'error';
}

function chatKey(orderId: string) {
  return ['admin-order-chat', orderId] as const;
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

/**
 * Admin order chat hook.
 *
 * Real-time delivery is handled by the global `/orders/stream` SSE (opened in
 * AdminLayout via `useOrdersRealtimeSync`). That hook dispatches
 * `turon:chat-message` and `turon:chat-read` custom DOM events, which this
 * hook listens to — so zero per-order SSE connections are needed here.
 *
 * Falls back to 10-second polling when the global stream is not connected.
 */
export function useAdminOrderChat(
  orderId: string,
  /** Whether the global SSE stream (useOrdersRealtimeSync) is connected */
  globalConnected = false,
) {
  const queryClient = useQueryClient();
  const adminId = useAuthStore((s) => s.user?.id ?? '');
  const adminName = useAuthStore((s) => s.user?.fullName ?? 'Admin');

  const { data: messages = [], isLoading } = useQuery({
    queryKey: chatKey(orderId),
    queryFn: async () => {
      const msgs = await (api.get(`/orders/${orderId}/admin-chat`) as Promise<AdminChatMessage[]>);
      // Invalidate inbox counters since fetching marks messages as read
      queryClient.invalidateQueries({ queryKey: ['admin-inbox'] });
      return msgs;
    },
    enabled: Boolean(orderId),
    staleTime: 10_000,
    refetchInterval: globalConnected ? false : 10_000,
  });

  // ── Append helper (dedup by id) ────────────────────────────────────────────
  const appendMessage = useCallback(
    (msg: AdminChatMessage) => {
      queryClient.setQueryData<AdminChatMessage[]>(chatKey(orderId), (prev) => {
        if (!prev) return [msg];
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      queryClient.invalidateQueries({ queryKey: ['admin-inbox'] });
    },
    [queryClient, orderId],
  );

  // ── DOM event listeners — fed by useOrdersRealtimeSync global stream ──────
  useEffect(() => {
    if (!orderId) return;

    const handleChatMessage = (e: Event) => {
      const { orderId: evtOrderId, chatMessage } = (e as CustomEvent).detail;
      if (evtOrderId !== orderId) return;
      appendMessage(chatMessage as AdminChatMessage);
    };

    const handleChatRead = (e: Event) => {
      const { orderId: evtOrderId } = (e as CustomEvent).detail;
      if (evtOrderId !== orderId) return;
      // Mark all messages in this order as read (admin opened the chat)
      queryClient.setQueryData<AdminChatMessage[]>(chatKey(orderId), (prev) =>
        prev ? prev.map((m) => ({ ...m, isRead: true })) : prev,
      );
    };

    window.addEventListener('turon:chat-message', handleChatMessage);
    window.addEventListener('turon:chat-read', handleChatRead);
    return () => {
      window.removeEventListener('turon:chat-message', handleChatMessage);
      window.removeEventListener('turon:chat-read', handleChatRead);
    };
  }, [orderId, appendMessage, queryClient]);

  // ── Send mutation with optimistic update ──────────────────────────────────
  const sendMutation = useMutation({
    mutationFn: ({
      content,
      targetRole,
    }: {
      content: string;
      targetRole: 'COURIER' | 'CUSTOMER' | null;
    }) =>
      api.post(`/orders/${orderId}/admin-chat`, {
        content,
        targetRole: targetRole ?? undefined,
      }) as Promise<AdminChatMessage>,

    onMutate: ({ content, targetRole }) => {
      const tempId = `optimistic-${Date.now()}-${Math.random()}`;
      const optimistic: AdminChatMessage = {
        id: tempId,
        orderId,
        senderId: adminId,
        senderRole: 'ADMIN',
        senderName: adminName,
        content,
        isRead: false,
        createdAt: new Date().toISOString(),
        targetRole: targetRole ?? null,
        _status: 'sending',
      };
      queryClient.setQueryData<AdminChatMessage[]>(chatKey(orderId), (prev) =>
        prev ? [...prev, optimistic] : [optimistic],
      );
      return { tempId };
    },

    onSuccess: (msg, _vars, context) => {
      queryClient.setQueryData<AdminChatMessage[]>(chatKey(orderId), (prev) => {
        if (!prev) return [{ ...msg, _status: 'sent' as const }];
        const without = prev.filter((m) => m.id !== context?.tempId);
        if (without.some((m) => m.id === msg.id)) return without; // SSE already added it
        return [...without, { ...msg, _status: 'sent' as const }];
      });
      queryClient.invalidateQueries({ queryKey: ['admin-inbox'] });
    },

    onError: (_err, _vars, context) => {
      if (context?.tempId) {
        queryClient.setQueryData<AdminChatMessage[]>(chatKey(orderId), (prev) =>
          prev ? prev.filter((m) => m.id !== context.tempId) : prev,
        );
      }
    },
  });

  return {
    messages,
    isLoading,
    sendMessage: (content: string, targetRole: 'COURIER' | 'CUSTOMER' | null = null) =>
      sendMutation.mutateAsync({ content, targetRole }),
    isSending: sendMutation.isPending,
  };
}

/** Total unread count across all orders (for dashboard badge) */
export function useAdminUnreadTotal() {
  return useQuery({
    queryKey: ['admin-inbox'],
    queryFn: () => api.get('/orders/chats') as Promise<AdminInbox>,
    select: (data) =>
      [...data.courierMessages, ...data.customerMessages].reduce(
        (sum, e) => sum + e.unreadCount,
        0,
      ),
    refetchInterval: 15_000,
    staleTime: 5_000,
  });
}
