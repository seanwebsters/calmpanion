"use client";

import { useSyncExternalStore } from "react";

// A shared clock that ticks every 15s while anything is subscribed. Renders stay pure and
// prerendering sees a stable value (0) instead of an unstable Date.now().
let current = 0;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(cb: () => void) {
  listeners.add(cb);
  current = Date.now();
  queueMicrotask(cb);
  timer ??= setInterval(() => {
    current = Date.now();
    listeners.forEach((l) => l());
  }, 15_000);
  return () => {
    listeners.delete(cb);
    if (!listeners.size && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

export function useNow() {
  return useSyncExternalStore(subscribe, () => current, () => 0);
}
