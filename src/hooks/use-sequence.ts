"use client";

import { useEffect, useRef, useState } from "react";

export interface TimedPhase {
  seconds: number;
}

/**
 * Drives a list of timed phases (tense/release, stretches…). Phase changes and completion
 * are reported from the timer callback, so renders stay pure. `phases` should be stable.
 */
export function useSequence(phases: TimedPhase[], running: boolean, handlers: { onPhase?: (i: number) => void; onDone?: () => void }) {
  const total = phases.reduce((a, p) => a + p.seconds, 0);
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0);
  const phaseRef = useRef(-1);
  const h = useRef(handlers);
  useEffect(() => {
    h.current = handlers;
  });

  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      elapsedRef.current += (now - last) / 1000;
      last = now;
      const e = elapsedRef.current;
      if (e >= total) {
        clearInterval(id);
        elapsedRef.current = total;
        setElapsed(total);
        h.current.onDone?.();
        return;
      }
      const idx = indexAt(phases, e);
      if (idx !== phaseRef.current) {
        phaseRef.current = idx;
        h.current.onPhase?.(idx);
      }
      setElapsed(e);
    }, 100);
    return () => clearInterval(id);
  }, [running, total, phases]);

  const index = indexAt(phases, Math.min(elapsed, total - 0.001));
  const phaseStart = phases.slice(0, index).reduce((a, p) => a + p.seconds, 0);
  const remaining = Math.max(0, phases[index].seconds - (elapsed - phaseStart));

  const jump = (i: number) => {
    const at = phases.slice(0, Math.max(0, Math.min(phases.length - 1, i))).reduce((a, p) => a + p.seconds, 0);
    elapsedRef.current = at;
    phaseRef.current = -1;
    setElapsed(at);
  };

  return { elapsed, total, index, remaining, progress: total ? Math.min(1, elapsed / total) : 0, reset: () => jump(0), jump };
}

export function indexAt(phases: TimedPhase[], t: number) {
  let acc = 0;
  for (let i = 0; i < phases.length; i++) {
    acc += phases[i].seconds;
    if (t < acc) return i;
  }
  return phases.length - 1;
}
