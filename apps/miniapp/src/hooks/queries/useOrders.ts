import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const useMyOrders = () => {
  return useQuery<any[]>({
    queryKey: ['my-orders'],
    queryFn: () => api.get('/orders/my'),
  });
};

export const useOrderDetails = (id: string) => {
  return useQuery({
    queryKey: ['order', id],
    queryFn: () => api.get(`/orders/${id}`),
    enabled: !!id,
  });
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/orders', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
    },
  });
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => 
      api.patch(`/orders/${id}/status`, { status }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['order', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
  });
};

export const useAdminOrders = () => {
  return useQuery<any[]>({
    queryKey: ['admin-orders'],
    queryFn: () => api.get('/orders'), // Admin route returns all
  });
};

export const useCourierOrders = () => {
  return useQuery<any[]>({
    queryKey: ['courier-orders'],
    queryFn: () => api.get('/courier/orders'),
  });
};

export const useUpdateDeliveryStage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) =>
      api.patch(`/courier/order/${id}/stage`, { stage }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['courier-orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
    }
  });
};
