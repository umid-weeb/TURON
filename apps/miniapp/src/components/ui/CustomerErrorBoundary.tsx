import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class CustomerErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message =
      error instanceof Error ? error.message : 'Kutilmagan xatolik yuz berdi.';
    return { hasError: true, errorMessage: message };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    // In production this would go to a logging service
    console.error('[CustomerErrorBoundary]', error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center animate-in zoom-in duration-300">
        <div className="mb-5 flex h-18 w-18 items-center justify-center rounded-[24px] border border-rose-400/20 bg-rose-400/10 text-rose-400">
          <AlertTriangle size={36} />
        </div>
        <h2 className="text-xl font-black tracking-tight text-slate-900">Sahifada xatolik</h2>
        <p className="mt-2 max-w-[280px] text-sm leading-relaxed text-slate-500">
          {this.state.errorMessage}
        </p>
        <button
          type="button"
          onClick={this.handleReset}
          className="mt-7 flex h-12 w-full max-w-[260px] items-center justify-center gap-2 rounded-[14px] border border-slate-200 bg-slate-100 text-sm font-black text-slate-900 transition-transform active:scale-[0.98]"
        >
          <RefreshCw size={16} />
          Qayta urinish
        </button>
        <button
          type="button"
          onClick={() => { window.location.href = '/customer'; }}
          className="mt-3 text-[12px] font-semibold text-slate-500 underline underline-offset-4 hover:text-slate-800"
        >
          Bosh sahifaga qaytish
        </button>
      </div>
    );
  }
}
