"use client";

import { useSyncExternalStore } from "react";
import { useApp } from "@/lib/store/app-store";

/** True once the persisted store has loaded from localStorage on the client. */
export function useHydrated() {
  return useSyncExternalStore(
    (cb) => useApp.persist.onFinishHydration(cb),
    () => useApp.persist.hasHydrated(),
    () => false,
  );
}
