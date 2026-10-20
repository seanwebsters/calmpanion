"use client";

import { ArrowRight, BookOpen, CalendarCheck, CloudSun, Settings2 } from "lucide-react";
import Link from "next/link";
import { Atmosphere } from "@/components/art/atmosphere";
import { MoodIcon } from "@/components/art/mood-icon";
import { Mascot } from "@/components/companion/mascot";
import { ContentRail, ContentRow } from "@/components/content/content-card";
import { Page } from "@/components/layout/app-shell";
import { Badge, Card, EmptyState, PageHeader, SectionHeader } from "@/components/ui/misc";
import { useHydrated } from "@/hooks/use-hydrated";
import { KIND_LABEL } from "@/lib/content/catalog";
import { practiceStreak, resolveContent, routineDoneToday, useApp } from "@/lib/store/app-store";
import { cn, dateKey, relativeDay } from "@/lib/utils";

const GOAL_LABEL: Record<string, string> = { sleep: "Sleep better", stress: "Less stress", relax: "Relax", focus: "Focus", habits: "Healthy habits", happiness: "Feel happier", mindfulness: "Mindfulness" };

export default function MyCalmPage() {
  const hydrated = useHydrated();
  const prefs = useApp((s) => s.preferences);
  const sessions = useApp((s) => s.sessions);
  const favourites = useApp((s) => s.favourites);
  const generated = useApp((s) => s.generatedStories);
  const routines = useApp((s) => s.routines);
  const completions = useApp((s) => s.completions);
  const checkIns = useApp((s) => s.checkIns);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);
  const thisWeek = sessions.filter((s) => s.completedAt && new Date(s.completedAt) >= weekStart);
  const minutesThisWeek = thisWeek.reduce((a, s) => a + s.minutes, 0);
  const { streak, activeDays } = practiceStreak(sessions, completions);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
  const completed = sessions.filter((s) => s.completedAt).slice(0, 5);
  const favItems = favourites.map((id) => resolveContent(id, generated)).filter((x) => x !== undefined);
  const todaysRoutines = routines.filter((r) => r.active && r.days.includes(new Date().getDay()));
  const doneRoutines = todaysRoutines.filter((r) => routineDoneToday(completions, r.id) === "done").length;

  if (!hydrated) {
    return (
      <Page>
        <PageHeader title="My Calm" />
        <div className="skeleton h-40 rounded-[28px]" />
      </Page>
    );
  }

  return (
    <>
      <Atmosphere dim={0.5} />
      <Page>
        <PageHeader title="My Calm" subtitle={prefs.userName ? `Your space, ${prefs.userName}` : "Your space"} />

        <Card className="relative overflow-hidden">
          <div className="flex items-center gap-4">
            <Mascot size={78} state={minutesThisWeek > 0 ? "happy" : "idle"} still />
            <div>
              <p className="font-display text-2xl">{minutesThisWeek > 0 ? `${minutesThisWeek} mindful minutes this week` : "A fresh week"}</p>
              <p className="text-sm text-white/65">{streak > 1 ? `${streak} days in a row. Lovely rhythm.` : thisWeek.length ? `${thisWeek.length} session${thisWeek.length === 1 ? "" : "s"} completed` : "Whatever you do this week counts. Even one breath."}</p>
            </div>
          </div>
          <div className="mt-5 flex justify-between">
            {days.map((d) => {
              const active = activeDays.has(dateKey(d));
              const isToday = dateKey(d) === dateKey();
              return (
                <div key={d.toISOString()} className="flex flex-col items-center gap-1.5">
                  <span className={cn("h-9 w-9 rounded-full transition", active ? "bg-gradient-to-br from-lilac-200 to-peach-200 shadow-glow" : "bg-white/8", isToday && !active && "ring-2 ring-white/30")} />
                  <span className={cn("text-[11px] font-semibold", isToday ? "text-white" : "text-white/50")}>{d.toLocaleDateString(undefined, { weekday: "narrow" })}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { href: "/check-in", label: "Check in", icon: CloudSun },
            { href: "/journal", label: "Journal", icon: BookOpen },
            { href: "/routines", label: "Routines", icon: CalendarCheck },
          ].map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="glass flex flex-col items-center gap-2 rounded-[22px] py-4 text-sm font-semibold transition hover:bg-white/15">
              <Icon className="h-6 w-6 text-lilac-200" />
              {label}
            </Link>
          ))}
        </div>

        <section className="mt-9">
          <SectionHeader title="Today's routines" href="/routines" action="Manage" />
          {todaysRoutines.length ? (
            <Card>
              <p className="text-sm text-white/65">
                {doneRoutines} of {todaysRoutines.length} done today{doneRoutines === todaysRoutines.length ? ". All wrapped up." : ""}
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-lilac-300 to-peach-300 transition-all" style={{ width: `${(doneRoutines / todaysRoutines.length) * 100}%` }} />
              </div>
              <ul className="mt-3 space-y-1.5">
                {todaysRoutines.map((r) => {
                  const st = routineDoneToday(completions, r.id);
                  return (
                    <li key={r.id} className="flex items-center justify-between text-sm">
                      <span>{r.name}</span>
                      <Badge tone={st === "done" ? "ai" : "default"}>{st === "done" ? "Done" : st === "skipped" ? "Skipped" : "Ready"}</Badge>
                    </li>
                  );
                })}
              </ul>
            </Card>
          ) : (
            <EmptyState title="No routines today" body="Routines are optional. Add one if a little structure would help.">
              <Link href="/routines" className="text-sm font-semibold text-lilac-200">
                Browse templates
              </Link>
            </EmptyState>
          )}
        </section>

        {prefs.storeCheckIns && checkIns.length > 0 && (
          <section className="mt-9">
            <SectionHeader title="Mood, lately" href="/check-in" action="Check in" />
            <Card className="flex items-center justify-between gap-2">
              {checkIns
                .slice(0, 7)
                .reverse()
                .map((c) => (
                  <div key={c.id} className="flex flex-col items-center">
                    <MoodIcon mood={c.mood} size={36} />
                    <span className="text-[10px] text-white/50">{new Date(c.createdAt).toLocaleDateString(undefined, { weekday: "short" })}</span>
                  </div>
                ))}
            </Card>
          </section>
        )}

        {favItems.length > 0 && (
          <section className="mt-9">
            <SectionHeader title="Favourites" />
            <ContentRail items={favItems} size="sm" />
          </section>
        )}

        <section className="mt-9">
          <SectionHeader title="Recently completed" />
          {completed.length ? (
            <div className="space-y-2">
              {completed.map((s) => {
                const item = resolveContent(s.contentId, generated);
                return item ? <ContentRow key={s.id} item={item} trailing={<span className="text-xs text-white/50">{relativeDay(s.completedAt!)}</span>} /> : null;
              })}
            </div>
          ) : (
            <EmptyState title="Nothing finished yet" body="When you complete a story, meditation or breathing session, it'll show up here." />
          )}
        </section>

        {sessions.length > 0 && (
          <section className="mt-9">
            <SectionHeader title="Listening history" />
            <Card className="divide-y divide-white/8 p-0">
              {sessions.slice(0, 10).map((s) => (
                <div key={s.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{s.title}</p>
                    <p className="text-xs text-white/50">
                      {KIND_LABEL[s.kind]} · {relativeDay(s.startedAt)}
                    </p>
                  </div>
                  <span className="text-xs text-white/60">{s.completedAt ? "Completed" : `${Math.round(s.progress * 100)}%`}</span>
                </div>
              ))}
            </Card>
          </section>
        )}

        <section className="mt-9">
          <SectionHeader title="Your preferences" href="/profile" action="Edit" />
          <Card>
            <div className="flex flex-wrap gap-2">
              {prefs.goals.map((g) => (
                <Badge key={g}>{GOAL_LABEL[g]}</Badge>
              ))}
              <Badge>{prefs.contentLength} sessions</Badge>
              <Badge>Bedtime {prefs.bedtime}</Badge>
              <Badge>{prefs.tone} tone</Badge>
              <Badge tone={prefs.memoryEnabled ? "ai" : "default"}>Memory {prefs.memoryEnabled ? "on" : "off"}</Badge>
            </div>
            <Link href="/profile/privacy" className="mt-4 flex items-center justify-between text-sm font-semibold text-lilac-200">
              <span className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" /> Memory &amp; Privacy
              </span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Card>
        </section>
      </Page>
    </>
  );
}
