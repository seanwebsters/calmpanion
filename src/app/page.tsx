"use client";

import { ClientOnly, PageSkeleton } from "@/components/layout/client-only";
import { motion } from "framer-motion";
import { ArrowRight, CloudSun, NotebookPen } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ActivityRail } from "@/components/activities/activity-rail";
import { Atmosphere, GREETINGS } from "@/components/art/atmosphere";
import { Composer, SuggestionChips } from "@/components/chat/composer";
import { Mascot, type MascotState } from "@/components/companion/mascot";
import { ContentRail } from "@/components/content/content-card";
import { Page } from "@/components/layout/app-shell";
import { usePlayer } from "@/components/player/player-provider";
import { Badge, SectionHeader } from "@/components/ui/misc";
import { useCapabilities } from "@/hooks/use-capabilities";
import { useHydrated } from "@/hooks/use-hydrated";
import { useTimeOfDay } from "@/hooks/use-time-of-day";
import { recommendContent } from "@/lib/content/catalog";
import { resolveContent, routineDoneToday, useApp } from "@/lib/store/app-store";
import { dateKey } from "@/lib/utils";

const RAIL_TITLE = { morning: "For your morning", afternoon: "For a midday pause", evening: "For this evening", night: "For tonight" } as const;

function HomePageContent() {
  const router = useRouter();
  const hydrated = useHydrated();
  const tod = useTimeOfDay();
  const caps = useCapabilities();
  const player = usePlayer();
  const prefs = useApp((s) => s.preferences);
  const sessions = useApp((s) => s.sessions);
  const favourites = useApp((s) => s.favourites);
  const memories = useApp((s) => s.memories);
  const routines = useApp((s) => s.routines);
  const completions = useApp((s) => s.completions);
  const checkIns = useApp((s) => s.checkIns);
  const generated = useApp((s) => s.generatedStories);
  const setPendingPrompt = useApp((s) => s.setPendingPrompt);
  const [mascotState, setMascotState] = useState<MascotState>("waving");

  useEffect(() => {
    const t = setTimeout(() => setMascotState("idle"), 3200);
    return () => clearTimeout(t);
  }, []);

  const time = tod ?? "evening";
  const greeting = GREETINGS[time];
  const name = prefs.userName ? `, ${prefs.userName}` : "";

  const recs = useMemo(
    () =>
      recommendContent(
        {
          timeOfDay: time,
          contentLength: prefs.contentLength,
          recentIds: sessions.map((s) => s.contentId),
          favouriteIds: favourites,
          likedTags: prefs.memoryEnabled ? memories.flatMap((m) => m.text.toLowerCase().split(/\W+/)) : [],
          need: prefs.goals.includes("focus") && time === "afternoon" ? "focus" : undefined,
        },
        undefined,
        6,
      ).map((r) => r.item),
    [time, prefs, sessions, favourites, memories],
  );

  const routineNow = routines.find((r) => r.active && (r.timeOfDay === time || (time === "night" && r.timeOfDay === "evening")) && r.days.includes(new Date().getDay()));
  const routineStatus = routineNow ? routineDoneToday(completions, routineNow.id) : undefined;
  const checkedInToday = checkIns.some((c) => dateKey(new Date(c.createdAt)) === dateKey());
  const continueItems = sessions
    .filter((s) => !s.completedAt && s.progress > 0.05 && s.progress < 0.95)
    .map((s) => resolveContent(s.contentId, generated))
    .filter((x) => x !== undefined)
    .filter((x, i, arr) => arr.findIndex((y) => y.id === x.id) === i)
    .slice(0, 4);

  const ask = (text: string) => {
    setPendingPrompt(text);
    router.push("/companion");
  };

  const line = routineNow && routineStatus !== "done" ? `Your "${routineNow.name}" is ready whenever you are.` : greeting.line;

  return (
    <>
      <Atmosphere />
      <Page className="flex min-h-[calc(100dvh-9rem)] flex-col pt-[max(env(safe-area-inset-top),20px)]">
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm font-semibold text-white/75">{hydrated ? new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" }) : " "}</p>
          {caps?.ai === "demo" && (
            <Link href="/profile#about">
              <Badge tone="demo">Demo mode</Badge>
            </Link>
          )}
        </div>

        <section className="flex flex-1 flex-col items-center justify-center py-6 text-center" aria-label="Your companion">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <h1 className="font-display text-[40px] leading-[1.05] text-white text-glow sm:text-5xl">
              {greeting.title}
              {name}
            </h1>
          </motion.div>
          <button onClick={() => router.push("/companion")} className="mt-2 rounded-full transition active:scale-95" aria-label={`Talk to ${prefs.companionName}`}>
            <Mascot state={time === "night" && mascotState === "idle" ? "idle" : mascotState} size={230} label={prefs.companionName} />
          </button>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }} className="glass relative -mt-2 max-w-sm rounded-[24px] px-5 py-3">
            <span className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-l border-t border-white/15 bg-white/10" aria-hidden />
            <p className="text-[16px] leading-snug">
              <span className="font-bold text-lilac-200">{prefs.companionName}:</span> {line}
            </p>
          </motion.div>
        </section>

        <div className="space-y-3">
          <SuggestionChips onPick={ask} />
          <Composer onSend={ask} />
        </div>
      </Page>

      <Page className="mt-10 space-y-9">
        <section>
          <SectionHeader title="Do something calming" href="/activities" action="All activities" />
          <ActivityRail />
        </section>

        {(routineNow || !checkedInToday) && (
          <section className="grid gap-3 sm:grid-cols-2">
            {routineNow && (
              <Link href="/routines" className="glass group flex items-center gap-4 rounded-[24px] p-4 transition hover:bg-white/15">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-lilac-300/40 to-peach-300/30">
                  <CloudSun className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-white/60">Today&apos;s routine</p>
                  <p className="truncate font-semibold">{routineNow.name}</p>
                  <p className="text-xs text-white/60">{routineStatus === "done" ? "Done today. Lovely." : routineStatus === "skipped" ? "Skipped today, and that's okay" : `${routineNow.steps.length} steps`}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-white/60 transition group-hover:translate-x-1" />
              </Link>
            )}
            {!checkedInToday && hydrated && (
              <Link href="/check-in" className="glass group flex items-center gap-4 rounded-[24px] p-4 transition hover:bg-white/15">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-300/40 to-lilac-300/30">
                  <NotebookPen className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-white/60">Check in</p>
                  <p className="font-semibold">How&apos;s your weather today?</p>
                  <p className="text-xs text-white/60">Optional · 20 seconds</p>
                </div>
                <ArrowRight className="h-5 w-5 text-white/60 transition group-hover:translate-x-1" />
              </Link>
            )}
          </section>
        )}

        {continueItems.length > 0 && (
          <section>
            <SectionHeader title="Continue listening" />
            <ContentRail items={continueItems} size="sm" />
          </section>
        )}

        <section>
          <SectionHeader title={RAIL_TITLE[time]} href="/explore" action="Explore all" />
          {hydrated ? <ContentRail items={recs} /> : <div className="skeleton h-64 rounded-[22px]" />}
        </section>

        {player.status === "idle" && (
          <p className="pb-4 text-center text-xs text-white/45">
            {prefs.companionName} is an AI companion, not a therapist.{" "}
            <Link href="/support" className="underline underline-offset-2">
              Support options
            </Link>
          </p>
        )}
      </Page>
    </>
  );
}

// Depends on the local store and the current date, so it renders in the browser only.
export default function HomePage() {
  return (
    <ClientOnly fallback={<PageSkeleton />}>
      <HomePageContent />
    </ClientOnly>
  );
}
