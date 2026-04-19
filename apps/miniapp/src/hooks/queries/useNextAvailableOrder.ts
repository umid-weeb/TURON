import { useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { CourierOrderPreview } from '../../data/types';

interface UseNextAvailableOrderOptions {
  onSuccess?: (order: CourierOrderPreview) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook to fetch and auto-accept the next available order
 * Used after a delivery is completed
 */
export const useNextAvailableOrder = (options?: UseNextAvailableOrderOptions) => {
  const queryClient = useQueryClient();
  const idempotencyKeyRef = useRef(crypto.randomUUID());

  return useMutation({
    mutationFn: async (): Promise<CourierOrderPreview | null> => {
      try {
        // Get next available order from queue
        const response = (await api.get('/courier/orders/next')) as {
          order?: CourierOrderPreview;
          noOrdersAvailable?: boolean;
        };

        if (!response.order || response.noOrdersAvailable) {
          return null;
        }

        // Auto-accept the next order
        const acceptResponse = (await api.post(
          `/courier/order/${response.order.id}/accept`,
          undefined,
          { headers: { 'Idempotency-Key': idempotencyKeyRef.current } },
        )) as {
          success: boolean;
          order?: CourierOrderPreview;
        };

        if (acceptResponse.success) {
          return response.order;
        }

        return null;
      } catch (error) {
        throw error instanceof Error ? error : new Error('Keyingi buyurtma olib bolib olmadi');
      }
    },

    onSuccess: (order) => {
      idempotencyKeyRef.current = crypto.randomUUID();

      if (order) {
        queryClient.invalidateQueries({ queryKey: ['courier-orders'] });
        queryClient.invalidateQueries({ queryKey: ['courier-status'] });

        options?.onSuccess?.(order);
      }
    },

    onError: (error) => {
      options?.onError?.(error instanceof Error ? error : new Error('Xatolik yuz berdi'));
    },
  });
};
