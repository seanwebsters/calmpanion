import type { BreathingPattern } from "./types";

export type PhaseName = "inhale" | "hold" | "exhale" | "holdAfter";

export interface Phase {
  name: PhaseName;
  label: string;
  seconds: number;
}

const LABELS: Record<PhaseName, string> = { inhale: "Breathe in", hold: "Hold", exhale: "Breathe out", holdAfter: "Rest" };

export function phasesFor(p: Pick<BreathingPattern, "inhale" | "hold" | "exhale" | "holdAfter">): Phase[] {
  return (["inhale", "hold", "exhale", "holdAfter"] as PhaseName[]).filter((n) => p[n] > 0).map((n) => ({ name: n, label: LABELS[n], seconds: p[n] }));
}

export function cycleSeconds(p: Pick<BreathingPattern, "inhale" | "hold" | "exhale" | "holdAfter">) {
  return p.inhale + p.hold + p.exhale + p.holdAfter;
}

/** Where we are after `elapsed` seconds: phase index, seconds left in it, and completed cycles. */
export function phaseAt(p: Pick<BreathingPattern, "inhale" | "hold" | "exhale" | "holdAfter">, elapsed: number) {
  const phases = phasesFor(p);
  const cycle = cycleSeconds(p);
  const cycles = Math.floor(elapsed / cycle);
  let t = elapsed - cycles * cycle;
  for (let i = 0; i < phases.length; i++) {
    if (t < phases[i].seconds) return { index: i, phase: phases[i], remaining: phases[i].seconds - t, cycles };
    t -= phases[i].seconds;
  }
  return { index: 0, phase: phases[0], remaining: phases[0].seconds, cycles: cycles + 1 };
}

/** Whole cycles that fit in the requested minutes (at least one). */
export function totalCycles(p: Pick<BreathingPattern, "inhale" | "hold" | "exhale" | "holdAfter">, minutes: number) {
  return Math.max(1, Math.round((minutes * 60) / cycleSeconds(p)));
}
