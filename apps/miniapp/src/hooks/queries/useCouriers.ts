import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AdminCourierDirectoryItem,
  CourierHistoryEntry,
  CourierProfile,
} from '../../data/types';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';

export const useAdminCourierDirectory = () =>
  useQuery<AdminCourierDirectoryItem[]>({
    queryKey: ['admin-courier-directory'],
    queryFn: async () => (await api.get('/couriers/admin')) as AdminCourierDirectoryItem[],
  });

export const useCreateCourierByAdmin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      telegramId: string;
      fullName: string;
      phoneNumber?: string;
      telegramUsername?: string;
      isActive: boolean;
    }) =>
      (await api.post('/couriers/admin', {
        ...payload,
        telegramId: payload.telegramId,
      })) as AdminCourierDirectoryItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courier-directory'] });
      queryClient.invalidateQueries({ queryKey: ['admin-couriers'] });
    },
  });
};

export const useUpdateCourierByAdmin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: {
        fullName?: string;
        phoneNumber?: string;
        telegramUsername?: string;
        isActive?: boolean;
      };
    }) => (await api.patch(`/couriers/admin/${id}`, payload)) as AdminCourierDirectoryItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courier-directory'] });
      queryClient.invalidateQueries({ queryKey: ['admin-couriers'] });
      queryClient.invalidateQueries({ queryKey: ['courier-profile'] });
    },
  });
};

export const useCourierProfile = () =>
  useQuery<CourierProfile>({
    queryKey: ['courier-profile'],
    queryFn: async () => (await api.get('/couriers/me/profile')) as CourierProfile,
  });

export const useUpdateCourierProfile = () => {
  const queryClient = useQueryClient();
  const updateUser = useAuthStore((state) => state.updateUser);

  return useMutation({
    mutationFn: async (payload: {
      fullName?: string;
      phoneNumber?: string;
      telegramUsername?: string;
    }) => (await api.patch('/couriers/me/profile', payload)) as CourierProfile,
    onSuccess: (profile) => {
      updateUser({
        fullName: profile.fullName,
        phoneNumber: profile.phoneNumber || undefined,
        telegramUsername: profile.telegramUsername || null,
      });
      queryClient.invalidateQueries({ queryKey: ['courier-profile'] });
    },
  });
};

export const useCourierHistory = () =>
  useQuery<CourierHistoryEntry[]>({
    queryKey: ['courier-history'],
    queryFn: async () => (await api.get('/couriers/me/history')) as CourierHistoryEntry[],
  });
