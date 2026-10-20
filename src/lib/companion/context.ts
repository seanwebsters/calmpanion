"use client";

import { routineDoneToday, type AppState } from "@/lib/store/app-store";
import { getTimeOfDay, relativeDay } from "@/lib/utils";
import type { CompanionContext } from "./tools";

/** Snapshot of what the companion is allowed to know for this turn. */
export function buildContext(s: AppState): CompanionContext {
  const p = s.preferences;
  return {
    localTime: new Date().toLocaleString(undefined, { weekday: "long", hour: "2-digit", minute: "2-digit" }),
    timeOfDay: getTimeOfDay(),
    companionName: p.companionName || "Nimbus",
    userName: p.userName || undefined,
    goals: p.goals,
    tone: p.tone,
    contentLength: p.contentLength,
    bedtime: p.bedtime,
    memoryEnabled: p.memoryEnabled,
    // Memories are only shared when the user has opted in.
    memories: p.memoryEnabled ? s.memories.slice(0, 30).map((m) => ({ category: m.category, text: m.text })) : [],
    recentSessions: s.sessions.slice(0, 10).map((x) => ({ contentId: x.contentId, title: x.title, kind: x.kind, when: relativeDay(x.startedAt), completed: Boolean(x.completedAt) })),
    routines: s.routines
      .filter((r) => r.active)
      .slice(0, 10)
      .map((r) => ({ id: r.id, name: r.name, timeOfDay: r.timeOfDay, steps: r.steps.map((x) => x.title), doneToday: routineDoneToday(s.completions, r.id) === "done" })),
    favouriteIds: s.favourites.slice(0, 50),
    generatedStories: s.generatedStories.slice(0, 20).map((g) => ({ id: g.id, title: g.title })),
  };
}
