"use client";

import { useEffect, useState } from "react";
import type { TimeOfDay } from "@/lib/types";
import { getTimeOfDay } from "@/lib/utils";

/** Client-only time of day, refreshed every minute. Null until mounted to avoid hydration mismatch. */
export function useTimeOfDay(): TimeOfDay | null {
  const [tod, setTod] = useState<TimeOfDay | null>(null);
  useEffect(() => {
    const update = () => setTod(getTimeOfDay());
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);
  return tod;
}
