"use client";

import { CheckCircle2 } from "lucide-react";
import { useMemo } from "react";
import { Atmosphere } from "@/components/art/atmosphere";
import { ContentCard, ContentRail } from "@/components/content/content-card";
import { Page } from "@/components/layout/app-shell";
import { Card, PageHeader, SectionHeader } from "@/components/ui/misc";
import { useHydrated } from "@/hooks/use-hydrated";
import { CATALOG, recommendContent } from "@/lib/content/catalog";
import { useApp } from "@/lib/store/app-store";
import { getTimeOfDay } from "@/lib/utils";

const GROUPS = [
  { id: "morning", title: "Morning mindfulness" },
  { id: "stress", title: "Stress reduction" },
  { id: "body-scan", title: "Body scan" },
  { id: "gratitude", title: "Gratitude" },
  { id: "relaxation", title: "Relaxation" },
  { id: "focus-meditations", title: "Focus" },
  { id: "evening", title: "Evening wind-down" },
  { id: "short-resets", title: "Short resets" },
];

export default function MeditatePage() {
  const hydrated = useHydrated();
  const sessions = useApp((s) => s.sessions);
  const prefs = useApp((s) => s.preferences);
  const meditations = CATALOG.filter((c) => c.kind === "meditation");
  const completed = new Set(sessions.filter((s) => s.kind === "meditation" && s.completedAt).map((s) => s.contentId));
  const minutes = sessions.filter((s) => s.kind === "meditation" && s.completedAt).reduce((a, s) => a + s.minutes, 0);
  const recs = useMemo(
    () => recommendContent({ kind: "meditation", timeOfDay: getTimeOfDay(), contentLength: prefs.contentLength, recentIds: sessions.map((s) => s.contentId) }, meditations, 4).map((r) => r.item),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [prefs.contentLength, sessions],
  );

  return (
    <>
      <Atmosphere dim={0.5} />
      <Page wide>
        <PageHeader title="Meditate" subtitle="Guided sessions for every part of the day" />
        {hydrated && (
          <Card className="flex items-center gap-5">
            <div className="relative h-16 w-16 shrink-0">
              <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90" aria-hidden>
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="url(#mg)" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${(completed.size / meditations.length) * 97.4} 97.4`} />
                <defs>
                  <linearGradient id="mg">
                    <stop offset="0%" stopColor="#cdbcfb" />
                    <stop offset="100%" stopColor="#ffc9b0" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                {completed.size}/{meditations.length}
              </span>
            </div>
            <div>
              <p className="font-semibold">{completed.size ? "Your practice so far" : "Start wherever feels right"}</p>
              <p className="text-sm text-white/65">{completed.size ? `${completed.size} sessions explored · ${minutes} mindful minutes` : "There's no right order. Even one minute counts."}</p>
            </div>
          </Card>
        )}

        <section className="mt-8">
          <SectionHeader title="Recommended now" />
          {hydrated ? <ContentRail items={recs} /> : <div className="skeleton h-64 rounded-[22px]" />}
        </section>

        {GROUPS.map((g) => {
          const items = meditations.filter((m) => m.categoryIds.includes(g.id));
          if (!items.length) return null;
          return (
            <section key={g.id} className="mt-9">
              <SectionHeader title={g.title} />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {items.map((m) => (
                  <div key={m.id} className="relative">
                    <ContentCard item={m} className="w-full" />
                    {completed.has(m.id) && <CheckCircle2 className="absolute left-3 top-3 h-5 w-5 text-sky-200" aria-label="Completed" />}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </Page>
    </>
  );
}
