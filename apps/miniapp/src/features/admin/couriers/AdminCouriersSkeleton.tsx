import React from 'react';

export function AdminCouriersSkeleton() {
  return (
    <div className="adminx-page space-y-3 pb-[calc(env(safe-area-inset-bottom,0px)+108px)] animate-pulse">
      <div className="adminx-surface rounded-[22px] px-4 py-4">
        <div className="h-12 rounded-[16px] bg-white/90" />
        <div className="mt-3 grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-[74px] rounded-[18px] bg-white/90" />
          ))}
        </div>
        <div className="mt-3 flex gap-2 overflow-hidden">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-10 w-20 shrink-0 rounded-full bg-white/90" />
          ))}
        </div>
      </div>
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="adminx-surface min-h-[148px] rounded-[22px] p-4" />
      ))}
    </div>
  );
}
