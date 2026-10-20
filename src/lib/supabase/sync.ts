"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppState } from "@/lib/store/app-store";
import type { CompanionPreferences, GeneratedStory } from "@/lib/types";

// Mirrors the local store into Supabase for signed-in users. Row-level security on every
// table restricts reads and writes to auth.uid(), so a user can only ever touch their own rows.

type Synced = Pick<
  AppState,
  "onboarded" | "preferences" | "memories" | "messages" | "sessions" | "favourites" | "routines" | "completions" | "checkIns" | "journal" | "generatedStories"
>;

async function replaceRows(sb: SupabaseClient, table: string, userId: string, rows: Record<string, unknown>[], key = "id") {
  if (rows.length) {
    const { error } = await sb.from(table).upsert(rows, { onConflict: key === "id" ? "id" : key });
    if (error) throw error;
  }
  // Remove rows deleted locally.
  let del = sb.from(table).delete().eq("user_id", userId);
  if (key === "id" && rows.length) del = del.not("id", "in", `(${rows.map((r) => r.id).join(",")})`);
  if (key !== "id" && rows.length) del = del.not("content_id", "in", `(${rows.map((r) => `"${r.content_id}"`).join(",")})`);
  const { error } = await del;
  if (error) throw error;
}

export async function pushAll(sb: SupabaseClient, userId: string, s: Synced) {
  const p = s.preferences;
  const now = new Date().toISOString();
  await sb.from("profiles").upsert({ id: userId, display_name: p.userName || null, onboarded: s.onboarded, updated_at: now }).throwOnError();
  await sb
    .from("companion_preferences")
    .upsert({
      user_id: userId,
      companion_name: p.companionName,
      goals: p.goals,
      voice: p.voice,
      tone: p.tone,
      bedtime: p.bedtime,
      content_length: p.contentLength,
      notifications_wanted: p.notificationsWanted,
      memory_enabled: p.memoryEnabled,
      save_conversations: p.saveConversations,
      journal_ai_consent: p.journalAiConsent,
      store_check_ins: p.storeCheckIns,
      voice_replies: p.voiceReplies,
      haptics_enabled: p.hapticsEnabled,
      breathing_sound_cues: p.breathingSoundCues,
      updated_at: now,
    })
    .throwOnError();

  await replaceRows(sb, "companion_memories", userId, s.memories.map((m) => ({ id: m.id, user_id: userId, category: m.category, text: m.text, source: m.source, created_at: m.createdAt, updated_at: m.updatedAt })));
  await replaceRows(sb, "favourites", userId, s.favourites.map((id) => ({ user_id: userId, content_id: id })), "user_id,content_id");
  await replaceRows(
    sb,
    "listening_sessions",
    userId,
    s.sessions.slice(0, 200).map((x) => ({ id: x.id, user_id: userId, content_id: x.contentId, title: x.title, kind: x.kind, started_at: x.startedAt, completed_at: x.completedAt ?? null, progress: x.progress, minutes: x.minutes })),
  );
  await replaceRows(
    sb,
    "routines",
    userId,
    s.routines.map((r) => ({ id: r.id, user_id: userId, name: r.name, description: r.description, time_of_day: r.timeOfDay, days: r.days, steps: r.steps, created_by: r.createdBy, active: r.active, created_at: r.createdAt })),
  );
  await replaceRows(sb, "routine_completions", userId, s.completions.map((c) => ({ id: c.id, user_id: userId, routine_id: c.routineId, date: c.date, status: c.status })));
  await replaceRows(sb, "check_ins", userId, s.checkIns.map((c) => ({ id: c.id, user_id: userId, mood: c.mood, energy: c.energy, note: c.note ?? null, created_at: c.createdAt })));
  await replaceRows(
    sb,
    "journal_entries",
    userId,
    s.journal.map((j) => ({ id: j.id, user_id: userId, prompt: j.prompt ?? null, body: j.body, reflection: j.reflection ?? null, created_at: j.createdAt, updated_at: j.updatedAt })),
  );
  await replaceRows(
    sb,
    "generated_stories",
    userId,
    s.generatedStories.map((g) => ({
      id: g.id,
      user_id: userId,
      title: g.title,
      subtitle: g.subtitle,
      description: g.description,
      request: g.request,
      script: g.script,
      artwork: g.artwork,
      ambience_preset_id: g.ambiencePresetId ?? null,
      generated_by: g.generatedBy,
      created_at: g.createdAt ?? now,
    })),
  );

  // Conversation history is only stored remotely when the user keeps it.
  if (p.saveConversations) {
    await sb.from("conversations").upsert({ id: userId, user_id: userId, title: "Companion", updated_at: now }).throwOnError();
    await replaceRows(
      sb,
      "messages",
      userId,
      s.messages.slice(-200).map((m) => ({ id: m.id, user_id: userId, conversation_id: userId, role: m.role, content: m.content, tool_events: m.toolEvents ?? null, content_ids: m.contentIds ?? null, created_at: m.createdAt })),
    );
  } else {
    await sb.from("conversations").delete().eq("user_id", userId).throwOnError();
  }
}

export async function pullAll(sb: SupabaseClient, userId: string): Promise<Partial<Synced> | null> {
  const { data: profile } = await sb.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (!profile) return null;
  const [prefs, memories, favs, sessions, routines, completions, checkIns, journal, stories] = await Promise.all([
    sb.from("companion_preferences").select("*").eq("user_id", userId).maybeSingle(),
    sb.from("companion_memories").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    sb.from("favourites").select("content_id").eq("user_id", userId),
    sb.from("listening_sessions").select("*").eq("user_id", userId).order("started_at", { ascending: false }).limit(200),
    sb.from("routines").select("*").eq("user_id", userId),
    sb.from("routine_completions").select("*").eq("user_id", userId),
    sb.from("check_ins").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    sb.from("journal_entries").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    sb.from("generated_stories").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
  ]);
  const pr = prefs.data;
  const preferences: Partial<CompanionPreferences> | undefined = pr
    ? {
        companionName: pr.companion_name,
        userName: profile.display_name ?? "",
        goals: pr.goals ?? [],
        voice: pr.voice,
        tone: pr.tone,
        bedtime: pr.bedtime,
        contentLength: pr.content_length,
        notificationsWanted: pr.notifications_wanted,
        memoryEnabled: pr.memory_enabled,
        saveConversations: pr.save_conversations,
        journalAiConsent: pr.journal_ai_consent,
        storeCheckIns: pr.store_check_ins,
        voiceReplies: pr.voice_replies,
        hapticsEnabled: pr.haptics_enabled,
        breathingSoundCues: pr.breathing_sound_cues,
      }
    : undefined;
  return {
    onboarded: Boolean(profile.onboarded),
    ...(preferences ? { preferences: preferences as CompanionPreferences } : {}),
    memories: (memories.data ?? []).map((m) => ({ id: m.id, category: m.category, text: m.text, source: m.source, createdAt: m.created_at, updatedAt: m.updated_at })),
    favourites: (favs.data ?? []).map((f) => f.content_id as string),
    sessions: (sessions.data ?? []).map((x) => ({ id: x.id, contentId: x.content_id, title: x.title, kind: x.kind, startedAt: x.started_at, completedAt: x.completed_at ?? undefined, progress: x.progress, minutes: x.minutes })),
    routines: (routines.data ?? []).map((r) => ({ id: r.id, name: r.name, description: r.description, timeOfDay: r.time_of_day, days: r.days, steps: r.steps, createdBy: r.created_by, active: r.active, createdAt: r.created_at })),
    completions: (completions.data ?? []).map((c) => ({ id: c.id, routineId: c.routine_id, date: c.date, status: c.status })),
    checkIns: (checkIns.data ?? []).map((c) => ({ id: c.id, mood: c.mood, energy: c.energy, note: c.note ?? undefined, createdAt: c.created_at })),
    journal: (journal.data ?? []).map((j) => ({ id: j.id, prompt: j.prompt ?? undefined, body: j.body, reflection: j.reflection ?? undefined, createdAt: j.created_at, updatedAt: j.updated_at })),
    generatedStories: (stories.data ?? []).map(
      (g): GeneratedStory => ({
        id: g.id,
        kind: "story",
        title: g.title,
        subtitle: g.subtitle,
        description: g.description,
        narrator: "Nimbus",
        categoryIds: ["sleep-stories", "your-stories"],
        tags: ["personalised"],
        needs: ["sleep", "relax"],
        artwork: g.artwork,
        script: g.script,
        ambiencePresetId: g.ambience_preset_id ?? undefined,
        source: "generated",
        generatedBy: g.generated_by,
        request: g.request,
        createdAt: g.created_at,
      }),
    ),
  };
}

/** Deletes every row the user owns. Used by "Delete all my data". */
export async function deleteAllRemote(sb: SupabaseClient, userId: string) {
  const tables = ["messages", "conversations", "companion_memories", "favourites", "listening_sessions", "routine_completions", "routines", "check_ins", "journal_entries", "generated_stories", "companion_preferences"];
  for (const t of tables) await sb.from(t).delete().eq("user_id", userId).throwOnError();
  await sb.from("profiles").delete().eq("id", userId).throwOnError();
}
