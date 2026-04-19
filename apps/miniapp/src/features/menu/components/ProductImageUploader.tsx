import React, { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
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
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-700">Rasm</label>

      {currentImageUrl ? (
        <div className="relative h-52 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          <img
            src={currentImageUrl}
            alt="Mahsulot rasmi"
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '';
            }}
          />
          <div className="absolute bottom-3 right-3 flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-9 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white/95 px-3 text-xs font-semibold text-slate-700 shadow-sm active:scale-95"
            >
              <Upload size={16} />
              O'zgartirish
            </button>
            <button
              type="button"
              onClick={onImageRemove}
              className="flex h-9 items-center justify-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-600 shadow-sm active:scale-95"
            >
              <X size={16} />
              Olib tashlash
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex h-52 w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 transition-colors active:border-blue-400 active:text-blue-600"
        >
          {uploading ? (
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          ) : (
            <>
              <ImageIcon size={32} />
              <span className="text-sm font-bold text-slate-700">Rasm yuklash</span>
              <span className="text-xs text-slate-500">PNG, JPG - maksimal 5MB</span>
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
