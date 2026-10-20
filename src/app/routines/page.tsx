"use client";

import { ClientOnly, PageSkeleton } from "@/components/layout/client-only";
import { Check, Pause, Play, Plus, SkipForward, Trash2, Undo2 } from "lucide-react";
import { useState } from "react";
import { Atmosphere } from "@/components/art/atmosphere";
import { Mascot } from "@/components/companion/mascot";
import { Page } from "@/components/layout/app-shell";
import { usePlayer } from "@/components/player/player-provider";
import { Button } from "@/components/ui/button";
import { Badge, Card, Chip, EmptyState, Field, inputClass, PageHeader, SectionHeader } from "@/components/ui/misc";
import { Sheet } from "@/components/ui/sheet";
import { useHydrated } from "@/hooks/use-hydrated";
import { CATALOG, contentMinutes, getContent, KIND_LABEL } from "@/lib/content/catalog";
import { practiceStreak, routineDoneToday, useApp } from "@/lib/store/app-store";
import type { Routine, RoutineStep, TimeOfDay } from "@/lib/types";
import { cn, dateKey } from "@/lib/utils";

const TEMPLATES: { name: string; description: string; timeOfDay: TimeOfDay; ids: string[] }[] = [
  { name: "Five-Minute Morning Reset", description: "Stretch, breathe, then set an intention", timeOfDay: "morning", ids: ["activity-gentle-stretch", "breathe-gentle", "morning-light"] },
  { name: "Afternoon Focus Break", description: "Ground, steady, then focus", timeOfDay: "afternoon", ids: ["activity-grounding", "breathe-box", "focus-25"] },
  { name: "Evening Wind-Down", description: "Let worries drift, notice the good", timeOfDay: "evening", ids: ["activity-worry-clouds", "activity-gratitude-jar", "dusk-wind-down"] },
  { name: "Bedtime Ritual", description: "Release tension, slow breath, then a story", timeOfDay: "night", ids: ["activity-muscle-release", "breathe-478", "cabin-in-the-rain"] },
];

const DAY = ["S", "M", "T", "W", "T", "F", "S"];
const TOD_LABEL: Record<TimeOfDay, string> = { morning: "Morning", afternoon: "Afternoon", evening: "Evening", night: "Bedtime" };

function toSteps(ids: string[]): RoutineStep[] {
  return ids
    .map((id) => getContent(id))
    .filter((c) => c !== undefined)
    .map((c) => ({ contentId: c.id, title: c.title, kind: c.kind, minutes: contentMinutes(c) }));
}

function RoutinesPageContent() {
  const hydrated = useHydrated();
  const player = usePlayer();
  const routines = useApp((s) => s.routines);
  const completions = useApp((s) => s.completions);
  const sessions = useApp((s) => s.sessions);
  const addRoutine = useApp((s) => s.addRoutine);
  const updateRoutine = useApp((s) => s.updateRoutine);
  const deleteRoutine = useApp((s) => s.deleteRoutine);
  const markRoutine = useApp((s) => s.markRoutine);
  const unmarkRoutine = useApp((s) => s.unmarkRoutine);
  const [creating, setCreating] = useState(false);
  const { streak } = practiceStreak(sessions, completions);

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  return (
    <>
      <Atmosphere dim={0.5} />
      <Page>
        <PageHeader title="Routines" subtitle="Small rituals that fit your day. Change or skip them any time.">
          <Button size="sm" variant="primary" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> New
          </Button>
        </PageHeader>

        {hydrated && streak > 1 && (
          <Card className="mb-6 flex items-center gap-4">
            <Mascot size={64} state="happy" still />
            <div>
              <p className="font-semibold">You&apos;ve shown up {streak} days in a row</p>
              <p className="text-sm text-white/65">Lovely. Rest days count as part of the rhythm too.</p>
            </div>
          </Card>
        )}

        {!hydrated ? (
          <div className="skeleton h-40 rounded-[28px]" />
        ) : routines.length === 0 ? (
          <EmptyState title="No routines yet" body="Pick a gentle template below, build your own, or ask your companion to make one for you." art={<Mascot size={90} still />} />
        ) : (
          <div className="space-y-4">
            {routines.map((r) => {
              const today = routineDoneToday(completions, r.id);
              const scheduledToday = r.days.includes(new Date().getDay());
              return (
                <Card key={r.id} className={cn(!r.active && "opacity-60")}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-display text-xl">{r.name}</p>
                        <Badge>{TOD_LABEL[r.timeOfDay]}</Badge>
                        {r.createdBy === "companion" && <Badge tone="ai">Made with your companion</Badge>}
                        {!r.active && <Badge tone="warn">Paused</Badge>}
                      </div>
                      <p className="mt-0.5 text-sm text-white/65">{r.description}</p>
                    </div>
                    <div className="flex">
                      <Button size="icon" variant="ghost" onClick={() => updateRoutine(r.id, { active: !r.active })} aria-label={r.active ? "Pause routine" : "Resume routine"}>
                        {r.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteRoutine(r.id)} aria-label="Delete routine">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <ol className="mt-4 space-y-2">
                    {r.steps.map((s, i) => (
                      <li key={s.contentId + i} className="flex items-center gap-3 rounded-2xl bg-white/6 p-2 pl-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold">{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{s.title}</p>
                          <p className="text-xs text-white/55">
                            {KIND_LABEL[s.kind]} · {s.minutes} min
                          </p>
                        </div>
                        <Button size="icon" variant="ghost" onClick={() => player.play(s.contentId)} aria-label={`Start ${s.title}`}>
                          <Play className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ol>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="flex gap-1.5" aria-label="Last 7 days">
                      {last7.map((d) => {
                        const c = completions.find((x) => x.routineId === r.id && x.date === dateKey(d));
                        return (
                          <span key={d.toISOString()} title={d.toDateString()} className={cn("flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold", c?.status === "done" ? "bg-lilac-200 text-night-900" : c?.status === "skipped" ? "bg-white/15 text-white/60" : "bg-white/5 text-white/40")}>
                            {DAY[d.getDay()]}
                          </span>
                        );
                      })}
                    </div>
                    {r.active && (
                      <div className="flex gap-2">
                        {today ? (
                          <Button size="sm" variant="ghost" onClick={() => unmarkRoutine(r.id)}>
                            <Undo2 className="h-4 w-4" /> {today === "done" ? "Done" : "Skipped"}
                          </Button>
                        ) : (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => markRoutine(r.id, "skipped")} title="Skipping is fine">
                              <SkipForward className="h-4 w-4" /> Skip
                            </Button>
                            <Button size="sm" variant="primary" onClick={() => markRoutine(r.id, "done")}>
                              <Check className="h-4 w-4" /> Done
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  {r.active && !scheduledToday && <p className="mt-2 text-xs text-white/50">Not scheduled today, but you can still do it if you like.</p>}
                </Card>
              );
            })}
          </div>
        )}

        <section className="mt-10">
          <SectionHeader title="Gentle templates" />
          <div className="grid gap-3 sm:grid-cols-2">
            {TEMPLATES.map((t) => {
              const exists = routines.some((r) => r.name === t.name);
              return (
                <Card key={t.name} className="flex flex-col">
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-sm text-white/65">{t.description}</p>
                  <p className="mt-2 text-xs text-white/50">{toSteps(t.ids).map((s) => s.title).join(" → ")}</p>
                  <Button size="sm" variant={exists ? "ghost" : "glass"} className="mt-3 self-start" disabled={exists} onClick={() => addRoutine({ name: t.name, description: t.description, timeOfDay: t.timeOfDay, days: [0, 1, 2, 3, 4, 5, 6], steps: toSteps(t.ids), createdBy: "template" })}>
                    {exists ? "Added" : "Add routine"}
                  </Button>
                </Card>
              );
            })}
          </div>
          <p className="mt-4 text-center text-xs text-white/45">Reminders aren&apos;t available in this version, so nothing will be sent to you. Open the app whenever suits you.</p>
        </section>
      </Page>
      <CreateRoutineSheet open={creating} onOpenChange={setCreating} onCreate={(r) => addRoutine(r)} />
    </>
  );
}

function CreateRoutineSheet({ open, onOpenChange, onCreate }: { open: boolean; onOpenChange: (v: boolean) => void; onCreate: (r: Omit<Routine, "id" | "createdAt" | "active">) => void }) {
  const [name, setName] = useState("");
  const [tod, setTod] = useState<TimeOfDay>("evening");
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [ids, setIds] = useState<string[]>([]);
  const options = CATALOG.filter((c) => c.kind !== "soundscape");

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="New routine" description="Choose up to five steps.">
      <div className="space-y-5">
        <Field label="Name">
          <input className={inputClass} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sunday slow morning" />
        </Field>
        <div>
          <p className="mb-2 text-sm font-semibold">When</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(TOD_LABEL) as TimeOfDay[]).map((t) => (
              <Chip key={t} active={tod === t} onClick={() => setTod(t)}>
                {TOD_LABEL[t]}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">Days</p>
          <div className="flex gap-1.5">
            {DAY.map((d, i) => (
              <button key={i} onClick={() => setDays((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i].sort()))} aria-pressed={days.includes(i)} className={cn("h-10 w-10 rounded-full text-sm font-bold", days.includes(i) ? "bg-lilac-200 text-night-900" : "bg-white/10")}>
                {d}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">Steps ({ids.length}/5)</p>
          <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
            {options.map((c) => {
              const idx = ids.indexOf(c.id);
              return (
                <button key={c.id} onClick={() => setIds((cur) => (idx >= 0 ? cur.filter((x) => x !== c.id) : cur.length < 5 ? [...cur, c.id] : cur))} className={cn("flex w-full items-center gap-3 rounded-2xl p-2.5 text-left text-sm", idx >= 0 ? "bg-lilac-200/20" : "bg-white/6")}>
                  <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold", idx >= 0 ? "bg-lilac-200 text-night-900" : "bg-white/10")}>{idx >= 0 ? idx + 1 : ""}</span>
                  <span className="flex-1">{c.title}</span>
                  <span className="text-xs text-white/50">{contentMinutes(c)}m</span>
                </button>
              );
            })}
          </div>
        </div>
        <Button
          variant="primary"
          className="w-full"
          disabled={!name.trim() || !ids.length || !days.length}
          onClick={() => {
            const steps = toSteps(ids);
            onCreate({ name: name.trim(), description: steps.map((s) => s.title).join(" → "), timeOfDay: tod, days, steps, createdBy: "user" });
            setName("");
            setIds([]);
            onOpenChange(false);
          }}
        >
          Create routine
        </Button>
      </div>
    </Sheet>
  );
}

// Depends on the local store and the current date, so it renders in the browser only.
export default function RoutinesPage() {
  return (
    <ClientOnly fallback={<PageSkeleton />}>
      <RoutinesPageContent />
    </ClientOnly>
  );
}
