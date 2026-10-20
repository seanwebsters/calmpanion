"use client";

import { AnimatePresence, motion, type TargetAndTransition } from "framer-motion";
import { Pause, Play, SkipForward, Square } from "lucide-react";
import { useState } from "react";
import { Mascot } from "@/components/companion/mascot";
import { Button } from "@/components/ui/button";
import { useSequence } from "@/hooks/use-sequence";
import type { ContentItem } from "@/lib/types";
import { ActivityComplete, ActivityShell, cue, useActivitySession } from "./activity-shell";

const MOVE = 30;

// Nimbus demonstrates each move with a gentle motion.
const STRETCHES: { name: string; how: string; switchAt?: string; demo: TargetAndTransition }[] = [
  { name: "Neck release", how: "Tilt your right ear towards your right shoulder. Breathe slowly.", switchAt: "Now the left side.", demo: { rotate: [0, 14, 14, 0, -14, -14, 0], transition: { duration: 8, repeat: Infinity } } },
  { name: "Shoulder rolls", how: "Roll your shoulders slowly up, back and down.", switchAt: "Now roll them forwards.", demo: { y: [0, -14, -4, 6, 0], transition: { duration: 3, repeat: Infinity } } },
  { name: "Side reach", how: "Reach your right arm up and over to the left. Feel the stretch along your side.", switchAt: "Switch sides.", demo: { rotate: [0, -16, -16, 0, 16, 16, 0], x: [0, -10, -10, 0, 10, 10, 0], transition: { duration: 9, repeat: Infinity } } },
  { name: "Wrist circles", how: "Hold your hands out and circle your wrists slowly.", switchAt: "Change direction.", demo: { rotate: [0, 6, 0, -6, 0], x: [0, 6, 0, -6, 0], transition: { duration: 2.4, repeat: Infinity } } },
  { name: "Seated twist", how: "Sit tall, place a hand on the opposite knee and gently twist.", switchAt: "Twist the other way.", demo: { scaleX: [1, 0.8, 0.8, 1, 0.8, 0.8, 1], transition: { duration: 8, repeat: Infinity } } },
  { name: "Chest opener", how: "Clasp your hands behind you, or hold your elbows. Lift your chest and breathe in deeply.", demo: { scale: [1, 1.12, 1.12, 1], transition: { duration: 6, repeat: Infinity } } },
];
const PHASES = STRETCHES.map(() => ({ seconds: MOVE }));

export function GentleStretch({ item }: { item: ContentItem }) {
  const session = useActivitySession(item);
  const [status, setStatus] = useState<"intro" | "running" | "paused" | "done">("intro");
  const seq = useSequence(PHASES, status === "running", {
    onPhase: () => cue(523, 0.08, 30),
    onDone: () => {
      setStatus("done");
      session.complete();
    },
  });
  const s = STRETCHES[seq.index];
  const switched = Boolean(s.switchAt) && seq.remaining <= MOVE / 2;

  const begin = () => {
    seq.reset();
    session.start();
    setStatus("running");
  };

  if (status === "done") return <ActivityShell item={item} atmosphere="morning"><ActivityComplete item={item} onRestart={begin} detail="A few minutes of movement can make a whole body feel lighter. Have some water if you can." /></ActivityShell>;

  if (status === "intro")
    return (
      <ActivityShell item={item} atmosphere="morning">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <Mascot state="waving" size={150} />
          <h2 className="mt-3 font-display text-3xl">Let&apos;s loosen up</h2>
          <p className="mt-2 max-w-sm text-white/75">Six easy moves, {MOVE} seconds each. You can sit or stand. Move slowly and only as far as feels good. Skip anything that doesn&apos;t suit your body.</p>
          <Button variant="primary" size="lg" className="mt-8 w-full max-w-xs" onClick={begin}>
            Begin · 3 minutes
          </Button>
        </div>
      </ActivityShell>
    );

  return (
    <ActivityShell item={item} atmosphere="morning" progress={seq.progress}>
      <div className="flex flex-1 flex-col items-center text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">
          Move {seq.index + 1} of {STRETCHES.length}
        </p>
        <div className="mt-4 flex h-56 items-center justify-center">
          <motion.div key={seq.index} animate={status === "running" ? s.demo : { rotate: 0, x: 0, y: 0, scale: 1, scaleX: 1 }}>
            <Mascot size={170} state="idle" still />
          </motion.div>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={`${seq.index}-${switched}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <h2 className="font-display text-3xl">{s.name}</h2>
            <p className="mx-auto mt-2 max-w-sm text-lg text-white/85">{switched ? s.switchAt : s.how}</p>
          </motion.div>
        </AnimatePresence>
        <div className="relative mt-5 h-20 w-20">
          <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90" aria-hidden>
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#ffc9b0" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${(seq.remaining / MOVE) * 97.4} 97.4`} />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center font-display text-2xl tabular-nums">{Math.ceil(seq.remaining)}</span>
        </div>
        <div className="mt-auto flex gap-3 pt-6">
          <Button size="icon-lg" variant="primary" onClick={() => setStatus(status === "running" ? "paused" : "running")} aria-label={status === "running" ? "Pause" : "Resume"}>
            {status === "running" ? <Pause className="h-7 w-7" /> : <Play className="ml-1 h-7 w-7" />}
          </Button>
          <Button size="icon-lg" variant="glass" onClick={() => seq.jump(seq.index + 1)} aria-label="Next move" disabled={seq.index >= STRETCHES.length - 1}>
            <SkipForward className="h-6 w-6" />
          </Button>
          <Button size="icon-lg" variant="glass" onClick={() => setStatus("intro")} aria-label="Stop">
            <Square className="h-6 w-6" />
          </Button>
        </div>
        <p className="mt-4 text-xs text-white/50">Stop if anything hurts. This is gentle movement, not exercise advice.</p>
      </div>
    </ActivityShell>
  );
}
