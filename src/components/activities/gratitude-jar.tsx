"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/misc";
import { useApp } from "@/lib/store/app-store";
import type { ContentItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ActivityComplete, ActivityShell, cue, useActivitySession } from "./activity-shell";

const PROMPTS = ["Something that made you smile today", "Someone you're glad is in your life", "Something small you often overlook"];
const GLOW = ["#ffd38a", "#cdbcfb", "#a9d6ff"];
const SPOTS = [
  { x: 82, y: 168 },
  { x: 118, y: 160 },
  { x: 100, y: 128 },
];

export function GratitudeJar({ item }: { item: ContentItem }) {
  const session = useActivitySession(item);
  const saveJournal = useApp((s) => s.saveJournal);
  const [items, setItems] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [done, setDone] = useState(false);
  const [saved, setSaved] = useState(false);

  const add = () => {
    const t = text.trim();
    if (!t || items.length >= 3) return;
    if (!items.length) session.start();
    const next = [...items, t];
    setItems(next);
    setText("");
    cue([523, 659, 784][next.length - 1], 0.08, 20);
    if (next.length === 3)
      setTimeout(() => {
        setDone(true);
        session.complete();
      }, 1600);
  };

  const restart = () => {
    setItems([]);
    setDone(false);
    setSaved(false);
  };

  const jar = (
    <svg viewBox="0 0 200 220" className="h-64 w-56" aria-label={`Gratitude jar with ${items.length} of 3 good things`}>
      <defs>
        <linearGradient id="jar-glass" x1="0" x2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.14" />
        </linearGradient>
        <radialGradient id="jar-glow">
          <stop offset="0%" stopColor="#fff6e0" />
          <stop offset="100%" stopColor="#fff6e0" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="150" r={30 + items.length * 18} fill="url(#jar-glow)" opacity={items.length * 0.12} />
      <rect x="62" y="22" width="76" height="18" rx="6" fill="#cdbcfb" opacity="0.85" />
      <path d="M70 40 h60 v16 c22 8 34 26 34 52 v74 c0 18 -14 28 -32 28 h-64 c-18 0 -32 -10 -32 -28 v-74 c0 -26 12 -44 34 -52 z" fill="url(#jar-glass)" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="2.5" />
      <path d="M52 110 c0 -16 6 -28 16 -34" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="4" strokeLinecap="round" fill="none" />
      <AnimatePresence>
        {items.map((_, i) => (
          <motion.g key={i} initial={{ y: -150, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", damping: 9, stiffness: 70 }}>
            <circle cx={SPOTS[i].x} cy={SPOTS[i].y} r="22" fill={GLOW[i]} opacity="0.35" />
            <motion.circle cx={SPOTS[i].x} cy={SPOTS[i].y} r="13" fill={GLOW[i]} animate={{ opacity: [0.75, 1, 0.75] }} transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.4 }} />
            <circle cx={SPOTS[i].x - 4} cy={SPOTS[i].y - 4} r="3.5" fill="#ffffff" opacity="0.8" />
          </motion.g>
        ))}
      </AnimatePresence>
    </svg>
  );

  if (done)
    return (
      <ActivityShell item={item} atmosphere="evening">
        <ActivityComplete
          item={item}
          onRestart={restart}
          headline="Your jar is glowing"
          detail={items.join(" · ")}
          extra={
            <Button
              variant="glass"
              className="w-full"
              disabled={saved}
              onClick={() => {
                saveJournal({ prompt: "Three good things", body: items.map((x) => `• ${x}`).join("\n") });
                setSaved(true);
              }}
            >
              {saved ? <Check className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />} {saved ? "Saved to your journal" : "Save to my journal"}
            </Button>
          }
        />
      </ActivityShell>
    );

  return (
    <ActivityShell item={item} atmosphere="evening" progress={items.length / 3}>
      <div className="flex flex-1 flex-col items-center text-center">
        {jar}
        <AnimatePresence mode="wait">
          <motion.h2 key={items.length} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-2 font-display text-2xl">
            {items.length < 3 ? PROMPTS[items.length] : "Three good things"}
          </motion.h2>
        </AnimatePresence>
        <p className="mt-1 text-sm text-white/60">Small is perfect. A warm drink counts.</p>
        <ul className="mt-4 w-full max-w-sm space-y-1.5">
          {items.map((t, i) => (
            <motion.li key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 rounded-2xl bg-white/8 px-4 py-2 text-left text-sm">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: GLOW[i] }} /> {t}
            </motion.li>
          ))}
        </ul>
        {items.length < 3 && (
          <form
            className="mt-auto flex w-full max-w-sm gap-2 pt-6"
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
          >
            <input className={cn(inputClass, "rounded-full")} value={text} maxLength={120} onChange={(e) => setText(e.target.value)} placeholder="Write it here…" aria-label={PROMPTS[items.length]} autoFocus />
            <Button type="submit" variant="primary" disabled={!text.trim()}>
              Add
            </Button>
          </form>
        )}
      </div>
    </ActivityShell>
  );
}
