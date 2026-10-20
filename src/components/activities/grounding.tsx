"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CupSoda, Ear, Eye, Flower2, Hand } from "lucide-react";
import { useState } from "react";
import { Mascot } from "@/components/companion/mascot";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/misc";
import type { ContentItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ActivityComplete, ActivityShell, cue, useActivitySession } from "./activity-shell";

const STEPS = [
  { n: 5, verb: "see", prompt: "Look around. Find five things you can see.", hint: "A colour, a shape, a patch of light, something small…", icon: Eye },
  { n: 4, verb: "feel", prompt: "Notice four things you can feel.", hint: "Your feet on the floor, fabric on your skin, the air…", icon: Hand },
  { n: 3, verb: "hear", prompt: "Listen for three sounds.", hint: "Near or far, loud or very quiet. Even your own breath.", icon: Ear },
  { n: 2, verb: "smell", prompt: "Find two things you can smell.", hint: "Or think of two smells you like if nothing's nearby.", icon: Flower2 },
  { n: 1, verb: "taste", prompt: "Notice one thing you can taste.", hint: "Or take a slow sip of water and notice that.", icon: CupSoda },
];

const PITCHES = [396, 440, 528, 594, 660];

export function Grounding({ item }: { item: ContentItem }) {
  const session = useActivitySession(item);
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [found, setFound] = useState<string[]>([]);
  const [word, setWord] = useState("");
  const [done, setDone] = useState(false);

  const current = STEPS[step];
  const totalTaps = STEPS.reduce((a, s) => a + s.n, 0);
  const tapsSoFar = STEPS.slice(0, step).reduce((a, s) => a + s.n, 0) + found.length;

  const add = (label: string) => {
    if (found.length >= current.n) return;
    const next = [...found, label];
    setFound(next);
    setWord("");
    cue(PITCHES[Math.min(next.length - 1, PITCHES.length - 1)], 0.06, 15);
    if (next.length === current.n) {
      setTimeout(() => {
        if (step === STEPS.length - 1) {
          setDone(true);
          session.complete();
          cue(528, 0.14, [30, 60, 30]);
        } else {
          setStep(step + 1);
          setFound([]);
          session.progress((tapsSoFar + 1) / totalTaps);
        }
      }, 900);
    }
  };

  const restart = () => {
    setStep(0);
    setFound([]);
    setDone(false);
    setStarted(true);
    session.start();
  };

  if (done) return <ActivityShell item={item}><ActivityComplete item={item} onRestart={restart} detail="You brought your attention back to the here and now, one sense at a time." /></ActivityShell>;

  if (!started)
    return (
      <ActivityShell item={item}>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <Mascot state="waving" size={150} />
          <h2 className="mt-3 font-display text-3xl">Let&apos;s come back to right here</h2>
          <p className="mt-2 max-w-sm text-white/75">We&apos;ll move through your senses one at a time. Tap a light for each thing you notice. You can type it too, but you don&apos;t have to. Nothing is saved.</p>
          <Button variant="primary" size="lg" className="mt-8 w-full max-w-xs" onClick={restart}>
            Begin
          </Button>
        </div>
      </ActivityShell>
    );

  const Icon = current.icon;
  return (
    <ActivityShell item={item} progress={tapsSoFar / totalTaps}>
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="flex flex-1 flex-col items-center text-center">
          <div className="relative mt-4 flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-sky-300/30 to-lilac-300/30 shadow-glow">
            <span className="font-display text-6xl">{current.n}</span>
            <span className="absolute -bottom-2 -right-2 flex h-11 w-11 items-center justify-center rounded-full bg-lilac-200 text-night-900">
              <Icon className="h-5 w-5" />
            </span>
          </div>
          <h2 className="mt-6 font-display text-2xl leading-snug">{current.prompt}</h2>
          <p className="mt-1 text-sm text-white/65">{current.hint}</p>

          <div className="mt-8 flex flex-wrap justify-center gap-2.5" role="group" aria-label={`Things you can ${current.verb}`}>
            {Array.from({ length: current.n }, (_, i) => {
              const filled = i < found.length;
              return (
                <div key={i} className="flex w-14 flex-col items-center gap-1.5">
                  <motion.button
                    onClick={() => !filled && i === found.length && add("")}
                    disabled={filled || i !== found.length}
                    aria-label={filled ? `Noticed ${i + 1}` : `Tap when you notice thing ${i + 1}`}
                    animate={filled ? { scale: [1, 1.25, 1] } : { scale: 1 }}
                    className={cn(
                      "h-12 w-12 rounded-full border-2 transition-colors",
                      filled ? "border-transparent bg-gradient-to-br from-sky-200 via-lilac-200 to-peach-200 shadow-glow" : i === found.length ? "border-lilac-200/70 bg-white/10 hover:bg-white/20" : "border-white/15 bg-white/5",
                    )}
                  />
                  <span className="h-4 max-w-14 truncate text-[11px] text-white/70">{found[i]}</span>
                </div>
              );
            })}
          </div>

          <form
            className="mt-6 flex w-full max-w-sm gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (word.trim()) add(word.trim());
            }}
          >
            <input className={cn(inputClass, "py-2.5")} value={word} maxLength={30} onChange={(e) => setWord(e.target.value)} placeholder={`Name something you ${current.verb} (optional)`} aria-label={`Something you ${current.verb}`} />
            <Button type="submit" variant="glass" disabled={!word.trim()}>
              Add
            </Button>
          </form>
          <div className="mt-auto flex items-center gap-2 pt-6 text-sm text-white/60">
            <Mascot size={40} state="listening" still /> Take your time. There&apos;s no wrong answer.
          </div>
        </motion.div>
      </AnimatePresence>
    </ActivityShell>
  );
}
