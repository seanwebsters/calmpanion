"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Pause, Play, SkipForward, Square } from "lucide-react";
import { useState } from "react";
import { Mascot } from "@/components/companion/mascot";
import { Button } from "@/components/ui/button";
import { useSequence } from "@/hooks/use-sequence";
import type { ContentItem } from "@/lib/types";
import { ActivityComplete, ActivityShell, cue, useActivitySession } from "./activity-shell";

const AREAS = [
  { area: "Hands & arms", tense: "Make two fists and squeeze gently.", release: "Let your fingers open and soften." },
  { area: "Shoulders", tense: "Lift your shoulders up towards your ears.", release: "Let them drop down, heavy and loose." },
  { area: "Face", tense: "Scrunch up your face: eyes, nose and mouth.", release: "Let every muscle in your face go smooth." },
  { area: "Belly", tense: "Gently tighten your stomach, as if bracing.", release: "Let your belly go soft and round." },
  { area: "Legs", tense: "Press your knees together and tighten your thighs.", release: "Let your legs go heavy and still." },
  { area: "Feet", tense: "Curl your toes downwards.", release: "Uncurl them and let your feet rest." },
];

const TENSE = 5;
const RELEASE = 10;
const PHASES = AREAS.flatMap((a) => [
  { seconds: TENSE, kind: "tense" as const, ...a },
  { seconds: RELEASE, kind: "release" as const, ...a },
]);

export function MuscleRelease({ item }: { item: ContentItem }) {
  const session = useActivitySession(item);
  const [status, setStatus] = useState<"intro" | "running" | "paused" | "done">("intro");
  const seq = useSequence(PHASES, status === "running", {
    onPhase: (i) => cue(PHASES[i].kind === "tense" ? 440 : 330, 0.07, PHASES[i].kind === "tense" ? 40 : [15, 40, 15]),
    onDone: () => {
      setStatus("done");
      session.complete();
    },
  });
  const phase = PHASES[seq.index];
  const tense = phase.kind === "tense";

  const begin = () => {
    seq.reset();
    session.start();
    setStatus("running");
  };

  if (status === "done") return <ActivityShell item={item} atmosphere="evening"><ActivityComplete item={item} onRestart={begin} detail="Notice how your body feels now compared with when you started." /></ActivityShell>;

  if (status === "intro")
    return (
      <ActivityShell item={item} atmosphere="evening">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <Mascot state="idle" size={150} />
          <h2 className="mt-3 font-display text-3xl">Tense, then let go</h2>
          <p className="mt-2 max-w-sm text-white/75">
            We&apos;ll move through six areas. Tense each one gently for {TENSE} seconds, then release for {RELEASE}. Use about half your strength: it should never hurt. Skip any area that feels uncomfortable.
          </p>
          <Button variant="primary" size="lg" className="mt-8 w-full max-w-xs" onClick={begin}>
            Begin · about 2 minutes
          </Button>
        </div>
      </ActivityShell>
    );

  return (
    <ActivityShell item={item} atmosphere="evening" progress={seq.progress}>
      <div className="flex flex-1 flex-col items-center text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">
          {AREAS.findIndex((a) => a.area === phase.area) + 1} of {AREAS.length} · {phase.area}
        </p>
        <div className="relative mt-6 flex h-64 w-64 items-center justify-center">
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{ scale: tense ? 0.7 : 1, opacity: tense ? 0.9 : 0.5, background: tense ? "radial-gradient(circle, rgba(255,176,143,0.55), transparent 70%)" : "radial-gradient(circle, rgba(180,160,244,0.5), transparent 70%)" }}
            transition={{ duration: tense ? 1.2 : 3, ease: "easeInOut" }}
          />
          <motion.div animate={{ scaleX: tense ? 0.86 : 1.04, scaleY: tense ? 0.8 : 1.04 }} transition={{ duration: tense ? 1 : 3, ease: "easeInOut" }}>
            <Mascot state={tense ? "thinking" : "sleeping"} size={180} still={tense} />
          </motion.div>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={seq.index} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <p className={tense ? "font-display text-4xl text-peach-200" : "font-display text-4xl text-lilac-200"}>{tense ? "Tense" : "Release"}</p>
            <p className="mt-2 max-w-sm text-lg">{tense ? phase.tense : phase.release}</p>
          </motion.div>
        </AnimatePresence>
        <p className="mt-3 font-display text-5xl tabular-nums" aria-live="off">
          {Math.ceil(seq.remaining)}
        </p>
        <div className="mt-auto flex gap-3 pt-6">
          <Button size="icon-lg" variant="primary" onClick={() => setStatus(status === "running" ? "paused" : "running")} aria-label={status === "running" ? "Pause" : "Resume"}>
            {status === "running" ? <Pause className="h-7 w-7" /> : <Play className="ml-1 h-7 w-7" />}
          </Button>
          <Button size="icon-lg" variant="glass" onClick={() => seq.jump(tense ? seq.index + 2 : seq.index + 1)} aria-label="Skip this area" disabled={seq.index >= PHASES.length - 2}>
            <SkipForward className="h-6 w-6" />
          </Button>
          <Button size="icon-lg" variant="glass" onClick={() => setStatus("intro")} aria-label="Stop">
            <Square className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </ActivityShell>
  );
}
