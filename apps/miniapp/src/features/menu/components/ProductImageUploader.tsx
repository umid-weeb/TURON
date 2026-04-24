import React, { useRef, useState } from 'react';
import { Image as ImageIcon, Upload, X } from 'lucide-react';
import { imageUploadService } from '../services/imageUploadService';

interface Props {
  currentImageUrl: string;
  onImageChange: (url: string) => void;
  onImageRemove: () => void;
}

const ProductImageUploader: React.FC<Props> = ({ currentImageUrl, onImageChange, onImageRemove }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Faqat rasm fayllarini yuklang');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Rasm hajmi 5MB dan oshmasin');
      return;
    }

    setError('');
    setUploading(true);
    try {
      const result = await imageUploadService.upload(file);
      onImageChange(result.url);
    } catch {
      setError('Rasm yuklanmadi');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      {currentImageUrl ? (
        <div className="relative h-56 w-full overflow-hidden rounded-[28px] border border-[var(--admin-pro-line)] bg-[linear-gradient(180deg,rgba(255,252,244,0.95)_0%,rgba(250,240,210,0.88)_100%)] shadow-[0_18px_36px_rgba(74,56,16,0.12)]">
          <img
            src={currentImageUrl}
            alt="Mahsulot rasmi"
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '';
            }}
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#18120a]/55 via-[#18120a]/22 to-transparent p-3">
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex h-10 items-center gap-1 rounded-xl border border-white/45 bg-white/88 px-3 text-xs font-black text-[var(--admin-pro-text)] backdrop-blur transition hover:bg-white active:scale-95"
              >
                <Upload size={14} />
                O'zgartirish
              </button>
              <button
                type="button"
                onClick={onImageRemove}
                className="inline-flex h-10 items-center gap-1 rounded-xl border border-rose-200/90 bg-[rgba(255,244,244,0.92)] px-3 text-xs font-black text-rose-600 backdrop-blur transition hover:bg-white active:scale-95"
              >
                <X size={14} />
                Olib tashlash
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="group flex h-56 w-full flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-[rgba(190,150,58,0.28)] bg-[linear-gradient(180deg,rgba(255,252,244,0.96)_0%,rgba(251,243,218,0.9)_100%)] px-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_20px_40px_rgba(74,56,16,0.08)] transition hover:border-[rgba(255,190,11,0.5)] hover:-translate-y-0.5 active:scale-[0.998] disabled:opacity-70"
        >
          {uploading ? (
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--admin-pro-primary-strong)] border-t-transparent" />
          ) : (
            <>
              <div className="mb-3 rounded-[22px] border border-[rgba(190,150,58,0.16)] bg-white/88 p-3 text-[var(--admin-pro-text-muted)] shadow-[0_12px_26px_rgba(74,56,16,0.08)] transition group-hover:scale-105 group-hover:text-[var(--admin-pro-primary-contrast)]">
                <ImageIcon size={24} />
              </div>
              <p className="text-sm font-black text-[var(--admin-pro-text)]">Rasm yuklash</p>
              <p className="mt-1 text-xs font-semibold text-[var(--admin-pro-text-muted)]">PNG, JPG - maksimal 5MB</p>
            </>
          )}
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {error ? <p className="text-xs font-bold text-rose-500">{error}</p> : null}
    </div>
  );
};

export default ProductImageUploader;
