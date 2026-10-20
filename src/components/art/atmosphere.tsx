"use client";

import { motion } from "framer-motion";
import { useTimeOfDay } from "@/hooks/use-time-of-day";
import type { ArtworkSpec, TimeOfDay } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Landscape } from "./landscape";

export const ATMOSPHERES: Record<TimeOfDay, ArtworkSpec> = {
  morning: { scene: "lake", palette: ["#2b3a86", "#c99ac4", "#ffd2b0"], sun: true, landmark: "tree" },
  afternoon: { scene: "mountains", palette: ["#2f4ea3", "#7aa6e3", "#d9e8ff"], sun: false, landmark: "none" },
  evening: { scene: "lake", palette: ["#141b52", "#5b4a9a", "#f2a68e"], moon: true, stars: true, landmark: "boat" },
  night: { scene: "mountains", palette: ["#050822", "#141c55", "#4b4a9c"], moon: true, stars: true, landmark: "cabin" },
};

export const GREETINGS: Record<TimeOfDay, { title: string; line: string }> = {
  morning: { title: "Good morning", line: "Want to start the day gently together?" },
  afternoon: { title: "Good afternoon", line: "How about a little pause to reset?" },
  evening: { title: "Good evening", line: "Want to wind down together?" },
  night: { title: "It's late", line: "Shall we get you ready for sleep?" },
};

/** Full-bleed living background that follows the time of day. */
export function Atmosphere({ className, override, dim = 0 }: { className?: string; override?: TimeOfDay; dim?: number }) {
  const live = useTimeOfDay();
  const tod = override ?? live ?? "evening";
  return (
    <div className={cn("pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-night-950", className)} aria-hidden>
      <motion.div key={tod} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2 }} className="absolute inset-0">
        <Landscape spec={ATMOSPHERES[tod]} seed={`atmo-${tod}`} animated detail="high" />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-night-950/10 to-night-950/85" />
      {dim > 0 && <div className="absolute inset-0 bg-night-950" style={{ opacity: dim }} />}
    </div>
  );
}
