"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getContent } from "@/lib/content/catalog";
import type {
  ChatMessage,
  CheckIn,
  CompanionMemory,
  CompanionPreferences,
  ContentItem,
  GeneratedStory,
  JournalEntry,
  ListeningSession,
  MemoryCategory,
  Routine,
  RoutineCompletion,
  SoundLayerSetting,
} from "@/lib/types";
import { dateKey, nowIso, uid } from "@/lib/utils";

/** One-shot launch requests from the companion, consumed by the destination page. */
export type PendingLaunch =
  | { type: "breathing"; pattern: "gentle" | "box" | "478" | "custom"; minutes: number; custom?: { inhale: number; hold: number; exhale: number; holdAfter: number }; autostart: boolean }
  | { type: "focus"; minutes: number; presetId?: string; intention?: string; autostart: boolean }
  | { type: "journal"; prompt?: string };

export const DEFAULT_PREFERENCES: CompanionPreferences = {
  companionName: "Nimbus",
  userName: "",
  goals: [],
  voice: "warm",
  tone: "gentle",
  bedtime: "22:30",
  contentLength: "medium",
  notificationsWanted: false,
  memoryEnabled: false,
  saveConversations: true,
  journalAiConsent: false,
  storeCheckIns: true,
  voiceReplies: true,
  hapticsEnabled: true,
  breathingSoundCues: true,
};

export interface AppState {
  onboarded: boolean;
  preferences: CompanionPreferences;
  memories: CompanionMemory[];
  messages: ChatMessage[];
  sessions: ListeningSession[];
  favourites: string[];
  routines: Routine[];
  completions: RoutineCompletion[];
  checkIns: CheckIn[];
  journal: JournalEntry[];
  generatedStories: GeneratedStory[];
  soundFavourites: { id: string; name: string; layers: SoundLayerSetting[] }[];
  pendingLaunch: PendingLaunch | null;
  pendingPrompt: string | null;
  /** bumped on every local change so the sync layer knows what to push */
  revision: number;

  completeOnboarding: (prefs: Partial<CompanionPreferences>) => void;
  updatePreferences: (prefs: Partial<CompanionPreferences>) => void;

  addMemory: (category: MemoryCategory, text: string, source?: CompanionMemory["source"]) => CompanionMemory | null;
  updateMemory: (id: string, text: string) => void;
  deleteMemory: (id: string) => void;
  clearMemories: () => void;

  addMessage: (m: Omit<ChatMessage, "id" | "createdAt">) => ChatMessage;
  clearMessages: () => void;

  startSession: (item: ContentItem, minutes: number) => string;
  updateSession: (id: string, patch: Partial<ListeningSession>) => void;

  toggleFavourite: (contentId: string) => void;

  addRoutine: (r: Omit<Routine, "id" | "createdAt" | "active">) => Routine;
  updateRoutine: (id: string, patch: Partial<Routine>) => void;
  deleteRoutine: (id: string) => void;
  markRoutine: (routineId: string, status: "done" | "skipped") => void;
  unmarkRoutine: (routineId: string) => void;

  addCheckIn: (c: Omit<CheckIn, "id" | "createdAt">) => CheckIn | null;
  deleteCheckIn: (id: string) => void;
  clearCheckIns: () => void;

  saveJournal: (entry: { id?: string; prompt?: string; body: string; reflection?: string[] }) => JournalEntry;
  deleteJournal: (id: string) => void;
  clearJournal: () => void;

  addGeneratedStory: (s: GeneratedStory) => void;
  deleteGeneratedStory: (id: string) => void;

  saveSoundMix: (name: string, layers: SoundLayerSetting[]) => void;
  deleteSoundMix: (id: string) => void;

  setPendingLaunch: (l: PendingLaunch | null) => void;
  setPendingPrompt: (p: string | null) => void;

  importRemote: (data: Partial<Pick<AppState, "preferences" | "memories" | "sessions" | "favourites" | "routines" | "completions" | "checkIns" | "journal" | "generatedStories" | "onboarded">>) => void;
  resetAll: () => void;
}

const initialData = {
  onboarded: false,
  preferences: DEFAULT_PREFERENCES,
  memories: [] as CompanionMemory[],
  messages: [] as ChatMessage[],
  sessions: [] as ListeningSession[],
  favourites: [] as string[],
  routines: [] as Routine[],
  completions: [] as RoutineCompletion[],
  checkIns: [] as CheckIn[],
  journal: [] as JournalEntry[],
  generatedStories: [] as GeneratedStory[],
  soundFavourites: [] as AppState["soundFavourites"],
  pendingLaunch: null as PendingLaunch | null,
  pendingPrompt: null as string | null,
  revision: 0,
};

export const useApp = create<AppState>()(
  persist(
    (set, get) => {
      const bump = (patch: Partial<AppState>) => set((s) => ({ ...patch, revision: s.revision + 1 }));
      return {
        ...initialData,

        completeOnboarding: (prefs) => bump({ onboarded: true, preferences: { ...get().preferences, ...prefs } }),
        updatePreferences: (prefs) => {
          const next = { ...get().preferences, ...prefs };
          // Turning off conversation saving also clears stored transcripts.
          bump({ preferences: next, ...(prefs.saveConversations === false ? { messages: [] } : {}), ...(prefs.storeCheckIns === false ? { checkIns: [] } : {}) });
        },

        addMemory: (category, text, source = "companion") => {
          if (!get().preferences.memoryEnabled) return null;
          const m: CompanionMemory = { id: uid(), category, text: text.trim(), createdAt: nowIso(), updatedAt: nowIso(), source };
          bump({ memories: [m, ...get().memories.filter((x) => x.text.toLowerCase() !== m.text.toLowerCase())].slice(0, 50) });
          return m;
        },
        updateMemory: (id, text) => bump({ memories: get().memories.map((m) => (m.id === id ? { ...m, text, updatedAt: nowIso(), source: "user" } : m)) }),
        deleteMemory: (id) => bump({ memories: get().memories.filter((m) => m.id !== id) }),
        clearMemories: () => bump({ memories: [] }),

        addMessage: (m) => {
          const msg: ChatMessage = { ...m, id: uid(), createdAt: nowIso() };
          set((s) => ({ messages: [...s.messages, msg].slice(-200), revision: s.revision + 1 }));
          return msg;
        },
        clearMessages: () => bump({ messages: [] }),

        startSession: (item, minutes) => {
          const id = uid();
          const s: ListeningSession = { id, contentId: item.id, title: item.title, kind: item.kind, startedAt: nowIso(), progress: 0, minutes };
          bump({ sessions: [s, ...get().sessions].slice(0, 300) });
          return id;
        },
        updateSession: (id, patch) => bump({ sessions: get().sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)) }),

        toggleFavourite: (contentId) => {
          const f = get().favourites;
          bump({ favourites: f.includes(contentId) ? f.filter((x) => x !== contentId) : [contentId, ...f] });
        },

        addRoutine: (r) => {
          const routine: Routine = { ...r, id: uid(), createdAt: nowIso(), active: true };
          bump({ routines: [routine, ...get().routines] });
          return routine;
        },
        updateRoutine: (id, patch) => bump({ routines: get().routines.map((r) => (r.id === id ? { ...r, ...patch } : r)) }),
        deleteRoutine: (id) => bump({ routines: get().routines.filter((r) => r.id !== id), completions: get().completions.filter((c) => c.routineId !== id) }),
        markRoutine: (routineId, status) => {
          const date = dateKey();
          const rest = get().completions.filter((c) => !(c.routineId === routineId && c.date === date));
          bump({ completions: [{ id: uid(), routineId, date, status }, ...rest] });
        },
        unmarkRoutine: (routineId) => {
          const date = dateKey();
          bump({ completions: get().completions.filter((c) => !(c.routineId === routineId && c.date === date)) });
        },

        addCheckIn: (c) => {
          const entry: CheckIn = { ...c, id: uid(), createdAt: nowIso() };
          if (!get().preferences.storeCheckIns) return entry; // used for suggestions only, never stored
          bump({ checkIns: [entry, ...get().checkIns].slice(0, 365) });
          return entry;
        },
        deleteCheckIn: (id) => bump({ checkIns: get().checkIns.filter((c) => c.id !== id) }),
        clearCheckIns: () => bump({ checkIns: [] }),

        saveJournal: ({ id, prompt, body, reflection }) => {
          const existing = id ? get().journal.find((j) => j.id === id) : undefined;
          const entry: JournalEntry = existing
            ? { ...existing, body, prompt: prompt ?? existing.prompt, reflection: reflection ?? existing.reflection, updatedAt: nowIso() }
            : { id: uid(), prompt, body, reflection, createdAt: nowIso(), updatedAt: nowIso() };
          bump({ journal: [entry, ...get().journal.filter((j) => j.id !== entry.id)] });
          return entry;
        },
        deleteJournal: (id) => bump({ journal: get().journal.filter((j) => j.id !== id) }),
        clearJournal: () => bump({ journal: [] }),

        addGeneratedStory: (s) => bump({ generatedStories: [s, ...get().generatedStories.filter((g) => g.id !== s.id)].slice(0, 30) }),
        deleteGeneratedStory: (id) => bump({ generatedStories: get().generatedStories.filter((g) => g.id !== id), favourites: get().favourites.filter((f) => f !== id) }),

        saveSoundMix: (name, layers) => bump({ soundFavourites: [{ id: uid(), name, layers }, ...get().soundFavourites].slice(0, 20) }),
        deleteSoundMix: (id) => bump({ soundFavourites: get().soundFavourites.filter((m) => m.id !== id) }),

        setPendingLaunch: (l) => set({ pendingLaunch: l }),
        setPendingPrompt: (p) => set({ pendingPrompt: p }),

        importRemote: (data) => set((s) => ({ ...s, ...data })),
        resetAll: () => set({ ...initialData, revision: get().revision + 1 }),
      };
    },
    {
      name: "calm-companion",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => {
        // Don't persist one-shot launch state; drop transcripts if the user opted out.
        const { pendingLaunch: _l, pendingPrompt: _p, ...rest } = s;
        void _l;
        void _p;
        return s.preferences.saveConversations ? rest : { ...rest, messages: [] };
      },
    },
  ),
);

/** Resolve an id against the catalog and the user's generated stories. */
export function resolveContent(id: string, generated: GeneratedStory[]): ContentItem | undefined {
  return getContent(id, generated);
}

export function routineDoneToday(completions: RoutineCompletion[], routineId: string) {
  const today = dateKey();
  return completions.find((c) => c.routineId === routineId && c.date === today)?.status;
}

/** Gentle streak: consecutive days (ending today or yesterday) with at least one completed session or routine. */
export function practiceStreak(sessions: ListeningSession[], completions: RoutineCompletion[]) {
  const days = new Set<string>();
  sessions.filter((s) => s.completedAt).forEach((s) => days.add(dateKey(new Date(s.completedAt!))));
  completions.filter((c) => c.status === "done").forEach((c) => days.add(c.date));
  let streak = 0;
  const d = new Date();
  if (!days.has(dateKey(d))) d.setDate(d.getDate() - 1);
  while (days.has(dateKey(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return { streak, activeDays: days };
}
