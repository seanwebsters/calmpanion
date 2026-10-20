"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Lock, Wind } from "lucide-react";
import { useState } from "react";
import { Mascot } from "@/components/companion/mascot";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/misc";
import type { ContentItem } from "@/lib/types";
import { cn, uid } from "@/lib/utils";
import { ActivityComplete, ActivityShell, cue, useActivitySession } from "./activity-shell";

interface Worry {
  id: string;
  text: string;
  tilt: number;
}

/** Worries live only in component state: never stored, never sent anywhere. */
export function WorryClouds({ item }: { item: ContentItem }) {
  const session = useActivitySession(item);
  const [text, setText] = useState("");
  const [worries, setWorries] = useState<Worry[]>([]);
  const [released, setReleased] = useState(0);
  const [done, setDone] = useState(false);

  const add = () => {
    const t = text.trim();
    if (!t) return;
    if (!worries.length && !released) session.start();
    setWorries((w) => [...w, { id: uid(), text: t, tilt: Math.random() * 6 - 3 }].slice(-6));
    setText("");
    cue(392, 0.05, 15);
  };

  const release = (id: string) => {
    setWorries((w) => w.filter((x) => x.id !== id));
    setReleased((r) => r + 1);
    cue([523, 587, 659, 784][released % 4], 0.07, [10, 30, 10]);
  };

  const releaseAll = () => worries.forEach((w, i) => setTimeout(() => release(w.id), i * 350));

  const restart = () => {
    setWorries([]);
    setReleased(0);
    setDone(false);
  };

  if (done)
    return (
      <ActivityShell item={item} atmosphere="afternoon">
        <ActivityComplete
          item={item}
          onRestart={restart}
          headline={`You let ${released} ${released === 1 ? "cloud" : "clouds"} drift away`}
          detail="Worries may float back, and that's normal. You can always set them down here again. If one keeps returning, talking it through with someone you trust can help."
        />
      </ActivityShell>
    );

  return (
    <ActivityShell item={item} atmosphere="afternoon">
      <div className="flex flex-1 flex-col">
        <div className="relative min-h-[46vh] flex-1 overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-b from-sky-300/10 to-transparent">
          {!worries.length && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <Mascot state={released ? "happy" : "idle"} size={120} still />
              <p className="mt-2 max-w-xs text-white/75">{released ? "The sky is clearer. Add another, or finish when you're ready." : "What's weighing on you? Write one worry at a time. Each becomes a cloud you can let drift away."}</p>
            </div>
          )}
          <div className="flex flex-wrap content-start justify-center gap-4 p-5">
            <AnimatePresence>
              {worries.map((w, i) => (
                <motion.button
                  key={w.id}
                  layout
                  initial={{ opacity: 0, scale: 0.6, y: 30 }}
                  animate={{ opacity: 1, scale: 1, y: [0, -6, 0], rotate: w.tilt }}
                  exit={{ opacity: 0, y: -260, x: 80 + i * 10, scale: 0.7, transition: { duration: 2.2, ease: "easeIn" } }}
                  transition={{ y: { duration: 4 + i, repeat: Infinity, ease: "easeInOut" }, default: { type: "spring", damping: 14 } }}
                  onClick={() => release(w.id)}
                  aria-label={`Let this worry drift away: ${w.text}`}
                  className="group relative max-w-[240px] px-7 pb-6 pt-7 text-left"
                >
                  <svg viewBox="0 0 240 120" preserveAspectRatio="none" className="absolute inset-0 h-full w-full drop-shadow-[0_8px_20px_rgba(5,8,34,0.35)]" aria-hidden>
                    <path d="M40 110 C10 110 4 80 26 70 C14 44 44 26 66 38 C76 10 120 4 136 30 C150 12 190 16 194 46 C226 46 238 78 214 96 C220 112 200 112 190 110 Z" fill="rgba(240,244,255,0.92)" />
                  </svg>
                  <span className="relative block text-[15px] font-semibold leading-snug text-night-800">{w.text}</span>
                  <span className="relative mt-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-night-600/70 group-hover:text-night-700">
                    <Wind className="h-3 w-3" /> Tap to let it drift
                  </span>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <input className={cn(inputClass, "rounded-full")} value={text} maxLength={120} onChange={(e) => setText(e.target.value)} placeholder="e.g. That email I haven't answered" aria-label="A worry" />
          <Button type="submit" variant="primary" disabled={!text.trim()}>
            Add
          </Button>
        </form>
        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-xs text-white/55">
            <Lock className="h-3 w-3" /> Nothing you type here is saved.
          </p>
          <div className="flex gap-2">
            {worries.length > 1 && (
              <Button size="sm" variant="glass" onClick={releaseAll}>
                Let them all go
              </Button>
            )}
            {released > 0 && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  setDone(true);
                  session.complete();
                }}
              >
                Finish
              </Button>
            )}
          </div>
        </div>
      </div>
    </ActivityShell>
  );
}
