import React from 'react';

// ── Base shimmer block ──────────────────────────────────────────────────────
export function Skeleton({
  className = '',
  rounded = 'rounded-[14px]',
}: {
  className?: string;
  rounded?: string;
}) {
  return (
    <div
      className={`animate-pulse bg-slate-200 ${rounded} ${className}`}
      aria-hidden="true"
    />
  );
}

// ── Courier order card skeleton ─────────────────────────────────────────────
export function CourierOrderCardSkeleton() {
  return (
    <div className="w-full rounded-[32px] border border-slate-100 bg-white p-5 shadow-sm">
      {/* Gradient header area */}
      <div className="rounded-[28px] bg-slate-100 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-8 w-20 rounded-[14px]" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Skeleton className="h-16 rounded-[22px]" />
          <Skeleton className="h-16 rounded-[22px]" />
        </div>
        <div className="mt-4 flex justify-between">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      {/* Footer stats */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16 rounded-[20px]" />
        ))}
      </div>
      {/* Bottom action row */}
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-14" />
      </div>
    </div>
  );
}

// ── Courier history card skeleton ───────────────────────────────────────────
export function CourierHistoryCardSkeleton() {
  return (
    <div className="w-full rounded-[26px] border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-3.5 w-36" />
        </div>
        <div className="space-y-1.5 text-right">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-3 w-28" />
      </div>
      <Skeleton className="mt-2.5 h-10 rounded-[14px]" />
      <div className="mt-2 flex gap-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-28" />
      </div>
    </div>
  );
}

// ── Customer order card skeleton ────────────────────────────────────────────
export function CustomerOrderCardSkeleton() {
  return (
    <div className="rounded-[14px] border border-white/8 bg-white/[0.05] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-3 w-20 bg-white/10" />
          <Skeleton className="h-6 w-28 bg-white/10" />
          <Skeleton className="h-3.5 w-40 bg-white/10" />
        </div>
        <Skeleton className="h-10 w-20 rounded-[10px] bg-white/10" />
      </div>
      <div className="mt-3 flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full bg-white/10" />
        <Skeleton className="h-6 w-24 rounded-full bg-white/10" />
      </div>
    </div>
  );
}

// ── Stat strip skeleton (3 cards) ───────────────────────────────────────────
export function StatStripSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${count}, 1fr)` }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-[18px] border border-slate-100 bg-white p-4 text-center shadow-sm">
          <Skeleton className="mx-auto h-7 w-12 rounded-[8px]" />
          <Skeleton className="mx-auto mt-2 h-2.5 w-14" />
        </div>
      ))}
    </div>
  );
}
