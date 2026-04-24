import React from 'react';

function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-[18px] ${className}`} />;
}

export function AdminDashboardRouteSkeleton() {
  return (
    <div className="space-y-6 pb-[calc(env(safe-area-inset-bottom,0px)+96px)]">
      <section className="admin-pro-card rounded-[20px] border border-slate-200/80 bg-white/95 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
        <Pulse className="h-3 w-24 bg-slate-200" />
        <Pulse className="mt-3 h-8 w-56 bg-slate-200" />
        <Pulse className="mt-2 h-4 w-64 bg-slate-100" />
      </section>

      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <section
            key={index}
            className="admin-pro-card rounded-[20px] border border-slate-200/80 bg-white/95 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)]"
          >
            <div className="flex items-start justify-between gap-2">
              <Pulse className="h-3 w-20 bg-slate-200" />
              <Pulse className="h-9 w-9 rounded-xl bg-slate-100" />
            </div>
            <Pulse className="mt-6 h-8 w-16 bg-slate-200" />
            <Pulse className="mt-3 h-3 w-24 bg-slate-100" />
          </section>
        ))}
      </div>

      <section className="admin-pro-card rounded-[20px] border border-slate-200/80 bg-white/95 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
        <Pulse className="h-3 w-28 bg-slate-200" />
        <Pulse className="mt-3 h-6 w-48 bg-slate-200" />
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="rounded-[20px] border border-slate-200 bg-slate-50/80 p-4"
            >
              <Pulse className="mx-auto h-11 w-11 rounded-xl bg-white" />
              <Pulse className="mx-auto mt-3 h-3 w-16 bg-white" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function AdminListRouteSkeleton() {
  return (
    <div className="space-y-4 pb-[calc(env(safe-area-inset-bottom,0px)+96px)]">
      <section className="admin-pro-card rounded-[20px] border border-slate-200/80 bg-white/95 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
        <Pulse className="h-12 w-full bg-slate-100" />
        <div className="mt-3 flex gap-2 overflow-hidden">
          {Array.from({ length: 5 }).map((_, index) => (
            <Pulse key={index} className="h-9 w-24 shrink-0 rounded-full bg-slate-100" />
          ))}
        </div>
      </section>

      {Array.from({ length: 4 }).map((_, index) => (
        <section
          key={index}
          className="admin-pro-card rounded-[18px] border border-slate-200/80 bg-white/95 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Pulse className="h-6 w-28 bg-slate-200" />
              <Pulse className="mt-3 h-4 w-36 bg-slate-100" />
            </div>
            <div className="text-right">
              <Pulse className="h-5 w-20 bg-slate-200" />
              <Pulse className="mt-3 h-3 w-16 bg-slate-100" />
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between gap-3">
            <Pulse className="h-4 w-28 bg-slate-100" />
            <div className="flex gap-2">
              <Pulse className="h-10 w-24 rounded-full bg-slate-100" />
              <Pulse className="h-10 w-28 rounded-full bg-slate-200" />
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

export function AdminFormRouteSkeleton() {
  return (
    <div className="space-y-4 pb-[calc(env(safe-area-inset-bottom,0px)+96px)]">
      <section className="admin-pro-card rounded-[20px] border border-slate-200/80 bg-white/95 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
        <Pulse className="h-4 w-36 bg-slate-200" />
        <Pulse className="mt-4 h-12 w-full bg-slate-100" />
        <Pulse className="mt-3 h-12 w-full bg-slate-100" />
        <Pulse className="mt-3 h-28 w-full bg-slate-100" />
      </section>
      <section className="admin-pro-card rounded-[20px] border border-slate-200/80 bg-white/95 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
        <Pulse className="h-4 w-28 bg-slate-200" />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Pulse className="h-12 w-full bg-slate-100" />
          <Pulse className="h-12 w-full bg-slate-100" />
        </div>
        <div className="mt-4 flex gap-3">
          <Pulse className="h-12 flex-1 bg-slate-200" />
          <Pulse className="h-12 flex-1 bg-slate-100" />
        </div>
      </section>
    </div>
  );
}

export function CourierCardsRouteSkeleton() {
  return (
    <div className="space-y-4 px-4 py-5 pb-32">
      <section className="courier-card-strong rounded-[32px] p-5">
        <div className="flex items-center gap-4">
          <Pulse className="h-[72px] w-[72px] rounded-[22px] bg-[var(--courier-accent-soft)]" />
          <div className="min-w-0 flex-1">
            <Pulse className="h-3 w-20 bg-black/10 dark:bg-white/10" />
            <Pulse className="mt-3 h-7 w-40 bg-black/10 dark:bg-white/10" />
            <Pulse className="mt-2 h-4 w-32 bg-black/5 dark:bg-white/8" />
          </div>
        </div>
      </section>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <section key={index} className="courier-card-strong rounded-[22px] p-4">
            <Pulse className="mx-auto h-7 w-12 bg-black/10 dark:bg-white/10" />
            <Pulse className="mx-auto mt-2 h-3 w-14 bg-black/5 dark:bg-white/8" />
          </section>
        ))}
      </div>
      <section className="courier-card-strong rounded-[30px] p-5">
        <Pulse className="h-4 w-32 bg-black/10 dark:bg-white/10" />
        <Pulse className="mt-4 h-12 w-full bg-black/5 dark:bg-white/8" />
        <Pulse className="mt-3 h-12 w-full bg-black/5 dark:bg-white/8" />
        <Pulse className="mt-3 h-12 w-full bg-black/5 dark:bg-white/8" />
      </section>
    </div>
  );
}

export function CourierListRouteSkeleton() {
  return (
    <div className="space-y-4 px-4 py-5 pb-32">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <Pulse className="h-3 w-20 bg-black/10 dark:bg-white/10" />
          <Pulse className="mt-3 h-7 w-44 bg-black/10 dark:bg-white/10" />
        </div>
        <Pulse className="h-11 w-11 rounded-[18px] bg-black/10 dark:bg-white/10" />
      </div>
      <section className="courier-card-strong rounded-[24px] p-2">
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Pulse key={index} className="h-[74px] rounded-[18px] bg-black/5 dark:bg-white/8" />
          ))}
        </div>
      </section>
      {Array.from({ length: 3 }).map((_, index) => (
        <section key={index} className="courier-card-strong rounded-[28px] p-4">
          <Pulse className="h-28 w-full bg-black/5 dark:bg-white/8" />
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Pulse className="h-16 bg-black/5 dark:bg-white/8" />
            <Pulse className="h-16 bg-black/5 dark:bg-white/8" />
            <Pulse className="h-16 bg-black/5 dark:bg-white/8" />
          </div>
        </section>
      ))}
    </div>
  );
}

export function CourierDetailRouteSkeleton() {
  return (
    <div className="space-y-4 px-4 py-5 pb-32">
      <section className="courier-card-strong rounded-[30px] p-5">
        <Pulse className="h-3 w-24 bg-black/10 dark:bg-white/10" />
        <Pulse className="mt-3 h-8 w-28 bg-black/10 dark:bg-white/10" />
        <div className="mt-5 flex items-center gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <React.Fragment key={index}>
              <Pulse className="h-12 w-12 rounded-full bg-black/5 dark:bg-white/8" />
              {index < 3 ? <Pulse className="h-1 flex-1 rounded-full bg-black/5 dark:bg-white/8" /> : null}
            </React.Fragment>
          ))}
        </div>
      </section>
      <section className="courier-card-strong rounded-[28px] p-4">
        <Pulse className="h-44 w-full bg-black/5 dark:bg-white/8" />
      </section>
      <section className="courier-card-strong rounded-[28px] p-4">
        <Pulse className="h-20 w-full bg-black/5 dark:bg-white/8" />
      </section>
      <section className="courier-card-strong rounded-[28px] p-4">
        <Pulse className="h-20 w-full bg-black/5 dark:bg-white/8" />
      </section>
    </div>
  );
}

export function CourierMapRouteSkeleton() {
  return (
    <div className="relative h-screen w-full overflow-hidden bg-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,216,76,0.14),transparent_42%),linear-gradient(180deg,#101012_0%,#18181c_100%)]" />
      <div className="absolute left-4 top-6 z-10">
        <Pulse className="h-12 w-12 rounded-[18px] bg-white/10" />
      </div>
      <div className="absolute left-4 top-24 z-10 w-[220px] space-y-2">
        <Pulse className="h-24 w-full rounded-[26px] bg-white/10" />
        <Pulse className="h-16 w-[180px] rounded-[22px] bg-white/10" />
      </div>
      <div className="absolute bottom-0 left-0 right-0 z-10 rounded-t-[28px] border border-white/8 bg-[#151517] px-4 pb-6 pt-4">
        <Pulse className="mx-auto h-1 w-10 rounded-full bg-white/10" />
        <Pulse className="mt-4 h-16 w-full rounded-[20px] bg-white/6" />
        <Pulse className="mt-3 h-20 w-full rounded-[20px] bg-white/6" />
        <Pulse className="mt-3 h-12 w-full rounded-[18px] bg-[rgba(255,216,76,0.18)]" />
        <div className="mt-4 grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Pulse key={index} className="h-14 rounded-[16px] bg-white/6" />
          ))}
        </div>
      </div>
    </div>
  );
}
