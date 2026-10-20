"use client";

import { useEffect, useState } from "react";

/** Current time, refreshed on an interval while enabled (keeps renders pure). */
export function useNow(intervalMs = 15_000, enabled = true) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);
  return now;
}
