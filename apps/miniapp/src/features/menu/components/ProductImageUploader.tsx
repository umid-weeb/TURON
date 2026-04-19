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
        <div className="relative h-56 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          <img
            src={currentImageUrl}
            alt="Mahsulot rasmi"
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '';
            }}
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/35 to-transparent p-3">
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-white/70 bg-white/90 px-3 text-xs font-semibold text-slate-700 backdrop-blur active:scale-95"
              >
                <Upload size={14} />
                O'zgartirish
              </button>
              <button
                type="button"
                onClick={onImageRemove}
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-rose-200 bg-rose-50/95 px-3 text-xs font-semibold text-rose-600 backdrop-blur active:scale-95"
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
          className="group flex h-56 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/70 px-4 text-center transition hover:border-blue-300 hover:bg-blue-50/40 active:scale-[0.998] disabled:opacity-70"
        >
          {uploading ? (
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          ) : (
            <>
              <div className="mb-3 rounded-2xl border border-slate-200 bg-white p-3 text-slate-500 shadow-sm">
                <ImageIcon size={24} />
              </div>
              <p className="text-sm font-bold text-slate-800">Rasm yuklash</p>
              <p className="mt-1 text-xs font-medium text-slate-500">PNG, JPG - maksimal 5MB</p>
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

      {error ? <p className="text-xs font-medium text-red-500">{error}</p> : null}
    </div>
  );
};

export default ProductImageUploader;

