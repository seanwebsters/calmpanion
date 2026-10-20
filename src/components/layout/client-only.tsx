"use client";

import { useHydrated } from "@/hooks/use-hydrated";

/** Renders children only after the local store has loaded in the browser. */
export function ClientOnly({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return useHydrated() ? <>{children}</> : <>{fallback}</>;
}

export function PageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-4 pt-20 sm:px-6" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-10 w-2/3 rounded-2xl" />
      <div className="skeleton h-48 rounded-[28px]" />
      <div className="skeleton h-32 rounded-[28px]" />
    </div>
  );
}
