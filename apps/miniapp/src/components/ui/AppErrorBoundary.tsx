import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  /** Visual theme — 'dark' for courier/admin map screens */
  theme?: 'light' | 'dark';
  /** URL to navigate to when user clicks "Go home" */
  homeUrl?: string;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class AppErrorBoundary extends React.Component<Props, State> {
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
    console.error('[AppErrorBoundary]', error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { theme = 'light', homeUrl = '/' } = this.props;
    const isDark = theme === 'dark';

    return (
      <div
        className={`flex min-h-[60vh] flex-col items-center justify-center px-6 text-center ${
          isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'
        }`}
      >
        <div
          className={`mb-5 flex h-16 w-16 items-center justify-center rounded-[24px] border ${
            isDark
              ? 'border-rose-400/20 bg-rose-400/10 text-rose-400'
              : 'border-rose-200 bg-rose-50 text-rose-500'
          }`}
        >
          <AlertTriangle size={32} />
        </div>

        <h2 className={`text-[18px] font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Sahifada xatolik yuz berdi
        </h2>
        <p
          className={`mt-2 max-w-[280px] text-[13px] leading-relaxed ${
            isDark ? 'text-white/50' : 'text-slate-500'
          }`}
        >
          {this.state.errorMessage}
        </p>

        <div className="mt-7 flex w-full max-w-[260px] flex-col gap-2">
          <button
            type="button"
            onClick={this.handleReset}
            className={`flex h-12 w-full items-center justify-center gap-2 rounded-[14px] text-[13px] font-black transition-transform active:scale-[0.98] ${
              isDark
                ? 'border border-white/10 bg-white/[0.07] text-white'
                : 'bg-slate-900 text-white'
            }`}
          >
            <RefreshCw size={15} />
            Qayta urinish
          </button>
          <button
            type="button"
            onClick={() => { window.location.href = homeUrl; }}
            className={`flex h-11 w-full items-center justify-center gap-2 rounded-[14px] text-[12px] font-semibold transition-transform active:scale-[0.98] ${
              isDark
                ? 'text-white/35'
                : 'text-slate-400'
            }`}
          >
            <Home size={14} />
            Bosh sahifaga qaytish
          </button>
        </div>
      </div>
    );
  }
}
