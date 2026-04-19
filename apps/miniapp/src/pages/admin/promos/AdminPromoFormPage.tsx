import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2 } from 'lucide-react';
import {
  useAdminPromos,
  useCreateAdminPromo,
  useUpdateAdminPromo,
} from '../../../hooks/queries/usePromos';
import { PromoForm } from '../../../features/promo/components/PromoForm';
import { PromoFormData } from '../../../features/promo/types';

const AdminPromoFormPage: React.FC = () => {
  const { promoId } = useParams<{ promoId: string }>();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isEditing = Boolean(promoId);
  const {
    data: promos = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useAdminPromos();
  const createPromoMutation = useCreateAdminPromo();
  const updatePromoMutation = useUpdateAdminPromo();

  const promoToEdit = useMemo(
    () => (isEditing ? promos.find((promo) => promo.id === promoId) : undefined),
    [isEditing, promoId, promos],
  );

  const isSubmitting = createPromoMutation.isPending || updatePromoMutation.isPending;

  const handleSubmit = async (data: PromoFormData) => {
    setSubmitError(null);

    try {
      if (isEditing && promoId) {
        await updatePromoMutation.mutateAsync({ id: promoId, data });
      } else {
        await createPromoMutation.mutateAsync(data);
      }

      navigate('/admin/promos');
    } catch (mutationFailure) {
      setSubmitError(
        mutationFailure instanceof Error ? mutationFailure.message : 'Promokod saqlanmadi',
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-[0_20px_46px_rgba(0,0,0,0.32)] backdrop-blur-xl">
          <Loader2 size={30} className="animate-spin text-indigo-300" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-rose-300/30 bg-slate-900/60 px-5 text-center shadow-[0_22px_48px_rgba(0,0,0,0.34)] backdrop-blur-xl">
        <AlertCircle size={34} className="text-rose-300" />
        <h2 className="mt-4 text-xl font-semibold text-white">Promokod yuklanmadi</h2>
        <p className="mt-2 text-sm text-slate-300">{(error as Error).message}</p>
        <button
          onClick={() => {
            void refetch();
          }}
          className="mt-4 text-sm font-semibold text-indigo-300"
        >
          Qayta urinish
        </button>
      </div>
    );
  }

  if (isEditing && !promoToEdit) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-white/10 bg-slate-900/60 px-5 text-center shadow-[0_22px_48px_rgba(0,0,0,0.34)] backdrop-blur-xl">
        <h2 className="mb-2 text-xl font-semibold text-white">Promokod topilmadi</h2>
        <button onClick={() => navigate('/admin/promos')} className="text-sm font-semibold text-indigo-300">
          Ortga qaytish
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 rounded-[28px] border border-white/10 bg-[#0f172a] p-4 shadow-[0_28px_70px_rgba(2,6,23,0.52)]">
      {submitError ? (
        <div className="rounded-2xl border border-rose-300/30 bg-rose-900/20 p-4">
          <p className="text-sm font-semibold text-rose-200">Promokod saqlanmadi</p>
          <p className="mt-1 text-xs leading-relaxed text-rose-300">{submitError}</p>
        </div>
      ) : null}

      <PromoForm
        title={isEditing ? 'Promokodni tahrirlash' : 'Yangi promokod'}
        initialData={promoToEdit}
        onSubmit={(data) => {
          void handleSubmit(data);
        }}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};

export default AdminPromoFormPage;
