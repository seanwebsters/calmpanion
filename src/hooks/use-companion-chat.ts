"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import type { ChatResponse } from "@/app/api/chat/route";
import { usePlayer } from "@/components/player/player-provider";
import { getAudioEngine } from "@/lib/audio/engine";
import { buildContext } from "@/lib/companion/context";
import type { ClientAction } from "@/lib/companion/tools";
import { contentMinutes, getContent } from "@/lib/content/catalog";
import { useApp } from "@/lib/store/app-store";
import { useUI } from "@/lib/store/ui-store";
import type { GeneratedStory, MemoryCategory, RoutineStep } from "@/lib/types";

/**
 * Sends a turn to /api/chat and applies the returned tool actions through the real
 * app functions: the player, the sound mixer, the router and the store.
 */
export function useCompanionChat() {
  const router = useRouter();
  const player = usePlayer();
  const messages = useApp((s) => s.messages);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyActions = useCallback(
    (actions: ClientAction[]) => {
      const app = useApp.getState();
      for (const a of actions) {
        switch (a.type) {
          case "play":
            player.play(a.contentId);
            break;
          case "addGeneratedStory": {
            const story: GeneratedStory = { ...a.story, source: "generated", generatedBy: a.story.generatedBy, request: a.story.request };
            app.addGeneratedStory(story);
            if (a.autoplay) player.play(story);
            break;
          }
          case "startBreathing":
            app.setPendingLaunch({ type: "breathing", pattern: a.pattern, minutes: a.minutes, custom: a.custom, autostart: true });
            router.push("/breathe");
            break;
          case "playSoundscape":
            void getAudioEngine()
              .setMix(a.layers)
              .then((ok) => {
                if (ok && a.timerMinutes) getAudioEngine().setTimer(a.timerMinutes);
                if (!ok) useUI.getState().showToast("Sound isn't available in this browser.");
              });
            break;
          case "startFocus":
            app.setPendingLaunch({ type: "focus", minutes: a.minutes, presetId: a.presetId, intention: a.intention, autostart: true });
            router.push("/focus");
            break;
          case "createRoutine": {
            const steps: RoutineStep[] = a.routine.contentIds
              .map((id) => getContent(id))
              .filter((c) => c !== undefined)
              .map((c) => ({ contentId: c.id, title: c.title, kind: c.kind, minutes: contentMinutes(c) }));
            app.addRoutine({ name: a.routine.name, description: a.routine.description, timeOfDay: a.routine.timeOfDay, days: a.routine.days, steps, createdBy: "companion" });
            useUI.getState().showToast(`Routine "${a.routine.name}" added to My Calm`);
            break;
          }
          case "saveMemory":
            if (app.addMemory(a.category as MemoryCategory, a.text, "companion")) useUI.getState().showToast("Saved to memory");
            break;
          case "openJournal":
            app.setPendingLaunch({ type: "journal", prompt: a.prompt });
            router.push("/journal");
            break;
          case "showSupport":
            useUI.getState().setSupportOpen(true);
            break;
          case "showContent":
            break; // rendered as cards in the message
        }
      }
    },
    [player, router],
  );

  const send = useCallback(
    async (text: string, opts?: { deferActions?: boolean }) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;
      setError(null);
      // Unlock audio inside the user gesture so actions can play sound when the reply lands.
      void getAudioEngine().unlock();
      const app = useApp.getState();
      app.addMessage({ role: "user", content: trimmed });
      setSending(true);
      try {
        const history = useApp.getState().messages.slice(-20).map((m) => ({ role: m.role, content: m.content, offers: m.offers }));
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history, context: buildContext(useApp.getState()) }),
        });
        const data = (await res.json()) as ChatResponse & { error?: string };
        if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
        const contentIds = data.actions.flatMap((a) => (a.type === "showContent" ? a.contentIds : []));
        app.addMessage({
          role: "assistant",
          content: data.reply,
          toolEvents: data.toolEvents,
          contentIds: contentIds.length ? contentIds : undefined,
          offers: data.offers,
          provider: data.provider,
          support: data.support,
        });
        if (!opts?.deferActions) applyActions(data.actions);
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't reach your companion.");
      } finally {
        setSending(false);
      }
    },
    [applyActions, sending],
  );

  return { messages, send, sending, error, applyActions, clearError: () => setError(null) };
}
