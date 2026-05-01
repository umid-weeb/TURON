import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export type ModificationType = 'CANCEL' | 'ADDRESS_CHANGE' | 'OTHER';
export type ModificationStatus =
  | 'PENDING'
  | 'AUTO_APPROVED'
  | 'APPROVED'
  | 'REJECTED';

export interface ModificationRequest {
  id: string;
  orderId: string;
  type: ModificationType;
  status: ModificationStatus;
  payload: any;
  reason: string | null;
  decisionNote: string | null;
  decidedAt: string | null;
  createdAt: string;
}

interface CreateInput {
  type: ModificationType;
  reason?: string;
  payload?: Record<string, unknown>;
}

interface CreateResult {
  request: ModificationRequest;
  mode: 'AUTO' | 'MANUAL';
}

const modificationKey = (orderId: string) =>
  ['order-modifications', orderId] as const;

/** List the customer's modification requests for a given order. */
export function useOrderModifications(orderId: string | undefined) {
  return useQuery<ModificationRequest[]>({
    queryKey: modificationKey(orderId ?? ''),
    queryFn: async () =>
      (await api.get(`/orders/${orderId}/modifications`)) as ModificationRequest[],
    enabled: Boolean(orderId),
    staleTime: 5_000,
    refetchInterval: 15_000,
  });
}

/**
 * Submit a new modification request. Returns the created request plus a
 * `mode` flag — 'AUTO' means the order was already cancelled/updated on
 * the spot (no admin action required), 'MANUAL' means the admin still
 * has to approve.
 */
export function useCreateOrderModification(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation<CreateResult, Error, CreateInput>({
    mutationFn: async (input) =>
      (await api.post(`/orders/${orderId}/modifications`, input)) as CreateResult,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: modificationKey(orderId) });
      // Refresh the order detail itself — auto-cancel changes status immediately.
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
    },
  });
}

/** Admin decision endpoint — approve or reject a customer's pending request. */
export function useDecideOrderModification(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation<
    ModificationRequest,
    Error,
    { reqId: string; approve: boolean; decisionNote?: string }
  >({
    mutationFn: async ({ reqId, approve, decisionNote }) =>
      (await api.post(`/orders/${orderId}/modifications/${reqId}/decide`, {
        approve,
        decisionNote,
      })) as ModificationRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: modificationKey(orderId) });
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

/** Admin dashboard list of all pending modification requests. */
export function usePendingModifications() {
  return useQuery<ModificationRequest[]>({
    queryKey: ['admin-modifications-pending'],
    queryFn: async () =>
      (await api.get('/orders/modifications/pending')) as ModificationRequest[],
    staleTime: 5_000,
    refetchInterval: 10_000,
  });
}
