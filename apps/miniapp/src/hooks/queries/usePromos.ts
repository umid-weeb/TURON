import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { PromoValidationResult } from '../../data/types';
import type { AdminPromo, PromoFormData } from '../../features/promo/types';

const promoKeys = {
  admin: ['admin-promos'] as const,
};

function normalizePromo(promo: AdminPromo): AdminPromo {
  return {
    ...promo,
    description: promo.description || '',
    usageLimit: promo.usageLimit ?? 0,
    timesUsed: promo.timesUsed ?? 0,
    isFirstOrderOnly: promo.isFirstOrderOnly ?? false,
    targetUserId: promo.targetUserId ?? null,
  };
}

function mergePromo(currentPromos: AdminPromo[] | undefined, promo: AdminPromo) {
  const normalizedPromo = normalizePromo(promo);

  if (!currentPromos?.length) {
    return [normalizedPromo];
  }

  const existingIndex = currentPromos.findIndex((currentPromo) => currentPromo.id === promo.id);

  if (existingIndex >= 0) {
    return currentPromos.map((currentPromo) =>
      currentPromo.id === promo.id ? normalizedPromo : currentPromo,
    );
  }

  return [normalizedPromo, ...currentPromos];
}

function toPromoPayload(data: PromoFormData) {
  return {
    code: data.code.trim().toUpperCase(),
    title: data.title.trim(),
    discountType: data.discountType,
    discountValue: data.discountValue,
    minOrderValue: data.minOrderValue,
    startDate: data.startDate,
    endDate: data.endDate || null,
    usageLimit: data.usageLimit,
    isActive: data.isActive,
    isFirstOrderOnly: data.isFirstOrderOnly,
    targetUserId: data.targetUserId?.trim() || null,
  };
}

export const useValidatePromo = () =>
  useMutation({
    mutationFn: async ({ code, subtotal, userId }: { code: string; subtotal: number; userId?: string }) =>
      (await api.post('/promos/validate', {
        code: code.trim().toUpperCase(),
        subtotal,
        ...(userId ? { userId } : {}),
      })) as PromoValidationResult,
  });

export const useAdminPromos = () =>
  useQuery<AdminPromo[]>({
    queryKey: promoKeys.admin,
    queryFn: async () => {
      const promos = (await api.get('/promos')) as AdminPromo[];
      return promos.map(normalizePromo);
    },
  });

export const useCreateAdminPromo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: PromoFormData) =>
      (await api.post('/promos', toPromoPayload(data))) as AdminPromo,
    onSuccess: (createdPromo) => {
      queryClient.setQueryData<AdminPromo[]>(promoKeys.admin, (currentPromos) =>
        mergePromo(currentPromos, createdPromo),
      );
    },
  });
};

export const useUpdateAdminPromo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PromoFormData }) =>
      (await api.put(`/promos/${id}`, toPromoPayload(data))) as AdminPromo,
    onSuccess: (updatedPromo) => {
      queryClient.setQueryData<AdminPromo[]>(promoKeys.admin, (currentPromos) =>
        mergePromo(currentPromos, updatedPromo),
      );
    },
  });
};

export const useDeleteAdminPromo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => api.delete(`/promos/${id}`),
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData<AdminPromo[]>(promoKeys.admin, (currentPromos) =>
        currentPromos?.filter((p) => p.id !== deletedId) ?? [],
      );
    },
  });
};
