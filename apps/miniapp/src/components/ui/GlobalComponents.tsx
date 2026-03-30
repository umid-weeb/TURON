import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

const cx = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(' ');


export interface AppButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-amber-500 hover:bg-amber-600 text-white border border-transparent',
  secondary: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200',
  danger: 'bg-rose-500 hover:bg-rose-600 text-white border border-transparent',
  ghost: 'bg-transparent hover:bg-slate-100 text-slate-700 border border-transparent',
};

const sizeStyles: Record<NonNullable<AppButtonProps['size']>, string> = {
  sm: 'h-10 text-xs px-3',
  md: 'h-12 text-sm px-4',
  lg: 'h-14 text-base px-5',
};

export const AppButton: React.FC<AppButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  children,
  className,
  ...rest
}) => {
  return (
    <button
      className={cx(
        'inline-flex items-center justify-center gap-2 font-black rounded-xl transition-all duration-200 ease-out active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        className
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
};

export interface AppCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  footer?: React.ReactNode;
  border?: boolean;
}

export const AppCard: React.FC<AppCardProps> = ({ title, subtitle, footer, border = true, children, className, ...rest }) => {
  return (
    <div
      className={cx(
        'bg-white shadow-lg rounded-3xl p-5',
        border && 'border border-slate-100',
        className
      )}
      {...rest}
    >
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h3 className="text-lg font-black text-slate-900">{title}</h3>}
          {subtitle && <p className="text-xs font-bold text-slate-400 mt-1">{subtitle}</p>}
        </div>
      )}
      {children}
      {footer && (
        <div className="mt-5 border-t border-slate-100 pt-4">{footer}</div>
      )}
    </div>
  );
};

export interface AppInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const AppInput: React.FC<AppInputProps> = ({ label, error, className, ...rest }) => {
  return (
    <label className="block w-full">
      {label && <span className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 block">{label}</span>}
      <input
        className={cx(
          'w-full h-12 px-3 rounded-xl border border-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 transition-all',
          error && 'border-rose-400 focus-visible:ring-rose-300',
          className
        )}
        {...rest}
      />
      {error && <p className="text-rose-500 text-xs font-bold mt-1">{error}</p>}
    </label>
  );
};
