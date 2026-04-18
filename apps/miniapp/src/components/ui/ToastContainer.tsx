import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useToastStore, type Toast as ToastType } from '../../store/useToastStore';

export const ToastContainer: React.FC = () => {
    const { toasts, removeToast } = useToastStore();

    return (
        <div
            className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none flex flex-col gap-2 p-4"
            style={{
                paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)',
            }}
        >
            {toasts.map((toast) => (
                <ToastItem
                    key={toast.id}
                    toast={toast}
                    onClose={() => removeToast(toast.id)}
                />
            ))}
        </div>
    );
};

const ToastItem: React.FC<{
    toast: ToastType;
    onClose: () => void;
}> = ({ toast, onClose }) => {
    useEffect(() => {
        if (toast.duration && toast.duration > 0) {
            const timer = setTimeout(onClose, toast.duration);
            return () => clearTimeout(timer);
        }
    }, [toast.duration, onClose]);

    const bgColorMap: Record<ToastType['type'], string> = {
        success: 'bg-emerald-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
    };
    
    const bgColor = bgColorMap[toast.type];

    const iconMap: Record<ToastType['type'], typeof CheckCircle> = {
        success: CheckCircle,
        error: AlertCircle,
        info: Info,
    };
    
    const Icon = iconMap[toast.type];

    return (
        <div
            className={`${bgColor} pointer-events-auto animate-in fade-in slide-in-from-top-4 duration-300 rounded-lg shadow-lg p-3 flex items-center gap-3 text-white max-w-sm`}
            role="alert"
        >
            <Icon size={20} strokeWidth={2} className="flex-shrink-0" />
            <p className="flex-1 text-sm font-medium">{toast.message}</p>
            <button
                onClick={onClose}
                className="flex-shrink-0 p-1 hover:bg-white/20 rounded-full transition-colors"
                aria-label="Close"
            >
                <X size={16} />
            </button>
        </div>
    );
};
