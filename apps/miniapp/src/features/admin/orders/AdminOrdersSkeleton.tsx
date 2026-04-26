import React from 'react';

export function AdminOrdersSkeleton() {
  return (
    <div className="adminx-page space-y-4 pb-[calc(env(safe-area-inset-bottom,0px)+108px)] animate-pulse">
      <div className="adminx-panel min-h-[220px] p-6" />
      <div className="flex gap-3 overflow-hidden pb-1">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-[108px] w-[148px] shrink-0 rounded-[24px] bg-white/90" />
        ))}
      </div>
      <div className="adminx-surface rounded-[24px] px-4 py-4">
        <div className="h-14 rounded-[18px] bg-white/95" />
        <div className="mt-4 flex gap-2 overflow-hidden">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-11 w-24 shrink-0 rounded-full bg-white/95" />
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="adminx-surface min-h-[178px] rounded-[24px] p-5" />
        ))}
      </div>
    </div>
  );
}
