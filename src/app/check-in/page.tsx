"use client";

import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Atmosphere } from "@/components/art/atmosphere";
import { MoodIcon } from "@/components/art/mood-icon";
import { Mascot } from "@/components/companion/mascot";
import { ContentRow } from "@/components/content/content-card";
import { Page } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, inputClass, PageHeader, SectionHeader } from "@/components/ui/misc";
import { Slider } from "@/components/ui/slider";
import { useHydrated } from "@/hooks/use-hydrated";
import { MOODS, suggestionsFor } from "@/lib/checkin";
import { getContent } from "@/lib/content/catalog";
import { useApp } from "@/lib/store/app-store";
import type { Mood } from "@/lib/types";
import { cn, getTimeOfDay, relativeDay } from "@/lib/utils";

const ENERGY = ["Running on empty", "Low", "Okay", "Good", "Full of beans"];

export default function CheckInPage() {
  const hydrated = useHydrated();
  const storeCheckIns = useApp((s) => s.preferences.storeCheckIns);
  const checkIns = useApp((s) => s.checkIns);
  const addCheckIn = useApp((s) => s.addCheckIn);
  const deleteCheckIn = useApp((s) => s.deleteCheckIn);
  const [mood, setMood] = useState<Mood | null>(null);
  const [energy, setEnergy] = useState(3);
  const [note, setNote] = useState("");
  const [result, setResult] = useState<ReturnType<typeof suggestionsFor> | null>(null);

  const submit = () => {
    if (!mood) return;
    addCheckIn({ mood, energy, note: note.trim() || undefined });
    setResult(suggestionsFor(mood, energy, getTimeOfDay()));
  };

  const recent = checkIns.slice(0, 14).reverse();

  return (
    <>
      <Atmosphere dim={0.5} />
      <Page>
        <PageHeader title="Check in" subtitle="What's the weather like inside today? Totally optional." />

        {result ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <div className="flex items-center gap-3">
                <Mascot size={70} state="happy" still />
                <p className="text-[15px] leading-relaxed">{result.message}</p>
              </div>
              <div className="mt-4 space-y-2">
                {result.contentIds.map((id) => {
                  const item = getContent(id);
                  return item ? <ContentRow key={id} item={item} /> : null;
                })}
              </div>
              <p className="mt-3 text-xs text-white/50">{storeCheckIns ? "Saved. You can delete it any time below." : "Not saved: check-in storage is off in Memory & Privacy."}</p>
              <Button
                variant="ghost"
                className="mt-2"
                onClick={() => {
                  setResult(null);
                  setMood(null);
                  setNote("");
                }}
              >
                Done
              </Button>
            </Card>
          </motion.div>
        ) : (
          <Card>
            <p className="font-semibold">Mood</p>
            <div className="mt-3 grid grid-cols-5 gap-2">
              {MOODS.map((m) => (
                <button key={m.id} onClick={() => setMood(m.id)} aria-pressed={mood === m.id} className={cn("flex flex-col items-center rounded-2xl py-2 transition active:scale-95", mood === m.id ? "bg-lilac-200/25 ring-2 ring-lilac-200" : "hover:bg-white/8")}>
                  <MoodIcon mood={m.id} size={48} />
                  <span className="mt-1 text-[11px] font-semibold">{m.label}</span>
                </button>
              ))}
            </div>
            <p className="mt-6 font-semibold">Energy</p>
            <Slider className="mt-3" value={[energy]} min={1} max={5} step={1} onValueChange={([v]) => setEnergy(v)} aria-label="Energy" />
            <p className="mt-2 text-sm text-white/70">{ENERGY[energy - 1]}</p>
            <p className="mt-6 font-semibold">Anything on your mind? <span className="font-normal text-white/50">(optional)</span></p>
            <textarea className={cn(inputClass, "mt-2 min-h-24")} value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} placeholder="A word or two is plenty" />
            <Button variant="primary" size="lg" className="mt-5 w-full" disabled={!mood} onClick={submit}>
              Check in
            </Button>
            <p className="mt-2 text-center text-xs text-white/50">Check-ins stay private and are never used to diagnose anything. Notes are not shared with the AI.</p>
          </Card>
        )}

        <section className="mt-10">
          <SectionHeader title="Your recent weather" href="/profile/privacy" action="Privacy" />
          {!hydrated ? (
            <div className="skeleton h-32 rounded-[28px]" />
          ) : !storeCheckIns ? (
            <EmptyState title="Check-in history is off" body="Your check-ins are used for suggestions in the moment, then forgotten.">
              <Link href="/profile/privacy" className="text-sm font-semibold text-lilac-200">
                Change in Memory &amp; Privacy
              </Link>
            </EmptyState>
          ) : recent.length === 0 ? (
            <EmptyState title="Nothing here yet" body="After a few check-ins you'll see a gentle picture of your days. No scores, no judgement." />
          ) : (
            <Card>
              <div className="flex items-end justify-between gap-1 overflow-x-auto">
                {recent.map((c) => (
                  <div key={c.id} className="flex min-w-9 flex-col items-center gap-1">
                    <MoodIcon mood={c.mood} size={30} />
                    <div className="flex h-16 w-2 items-end rounded-full bg-white/10">
                      <div className="w-full rounded-full bg-gradient-to-t from-lilac-400 to-peach-300" style={{ height: `${(c.energy / 5) * 100}%` }} />
                    </div>
                    <span className="text-[10px] text-white/50">{new Date(c.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "numeric" })}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-white/50">Icons show mood; bars show energy. Just a picture of your days, not a judgement.</p>
            </Card>
          )}
          {storeCheckIns && checkIns.length > 0 && (
            <ul className="mt-3 space-y-2">
              {checkIns.slice(0, 10).map((c) => (
                <li key={c.id} className="flex items-center gap-3 rounded-2xl bg-white/6 p-2 pl-3">
                  <MoodIcon mood={c.mood} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      {MOODS.find((m) => m.id === c.mood)?.label} · {ENERGY[c.energy - 1]}
                    </p>
                    <p className="truncate text-xs text-white/55">
                      {relativeDay(c.createdAt)}
                      {c.note ? ` · ${c.note}` : ""}
                    </p>
                  </div>
                  <button onClick={() => deleteCheckIn(c.id)} className="rounded-full p-2 text-white/50 hover:bg-white/10" aria-label="Delete check-in">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </Page>
    </>
  );
}
