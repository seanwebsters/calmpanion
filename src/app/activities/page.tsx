"use client";

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Atmosphere } from "@/components/art/atmosphere";
import { ClientOnly, PageSkeleton } from "@/components/layout/client-only";
import { Landscape } from "@/components/art/landscape";
import { Mascot } from "@/components/companion/mascot";
import { Page } from "@/components/layout/app-shell";
import { Chip, PageHeader } from "@/components/ui/misc";
import { ACTIVITY_TILES as TILES } from "@/components/activities/tiles";
import { useApp } from "@/lib/store/app-store";
import type { Need } from "@/lib/types";
import { cn, dateKey } from "@/lib/utils";

const FILTERS: { id: "all" | Need; label: string }[] = [
  { id: "all", label: "All" },
  { id: "stress", label: "Calm down" },
  { id: "sleep", label: "Wind down" },
  { id: "focus", label: "Focus" },
  { id: "happiness", label: "Feel good" },
  { id: "morning", label: "Wake up" },
];

function ActivitiesContent() {
  const sessions = useApp((s) => s.sessions);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const today = dateKey();
  const doneToday = new Set(sessions.filter((s) => s.completedAt && dateKey(new Date(s.completedAt)) === today).map((s) => s.contentId));
  const shown = TILES.filter((t) => filter === "all" || t.needs.includes(filter));

  return (
    <>
      <Atmosphere dim={0.45} />
      <Page wide>
        <PageHeader title="Activities" subtitle="Hands-on ways to feel a little better. Pick one and go." />
        <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:px-0">
          {FILTERS.map((f) => (
            <Chip key={f.id} active={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label}
            </Chip>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((t) => {
            const Icon = t.icon;
            const done = t.contentIds.some((id) => doneToday.has(id));
            return (
              <Link key={t.key} href={t.href} className="group relative flex h-36 overflow-hidden rounded-[26px] transition-transform active:scale-[0.98] sm:h-44">
                <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-105">
                  <Landscape spec={t.artwork} seed={t.key} />
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-night-950/85 via-night-950/45 to-transparent" />
                <div className="relative flex flex-1 flex-col justify-between p-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-display text-xl leading-tight">{t.title}</p>
                    <p className="text-sm text-white/75">{t.blurb}</p>
                  </div>
                </div>
                <div className="relative flex flex-col items-end justify-between p-4">
                  <span className="rounded-full bg-night-950/50 px-2.5 py-1 text-xs font-bold">{t.minutes} min</span>
                  {done && (
                    <span className={cn("flex items-center gap-1 rounded-full bg-sky-300/20 px-2.5 py-1 text-xs font-semibold text-sky-100")}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Today
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
        <Link href="/companion" className="glass mt-6 flex items-center gap-3 rounded-[24px] p-4 transition hover:bg-white/15">
          <Mascot size={48} still />
          <p className="text-sm">
            <span className="font-semibold">Not sure which?</span> <span className="text-white/70">Tell your companion how you feel and it&apos;ll pick one with you.</span>
          </p>
        </Link>
      </Page>
    </>
  );
}

// Shows "done today" badges from local history, so it renders in the browser only.
export default function ActivitiesPage() {
  return (
    <ClientOnly fallback={<PageSkeleton />}>
      <ActivitiesContent />
    </ClientOnly>
  );
}
