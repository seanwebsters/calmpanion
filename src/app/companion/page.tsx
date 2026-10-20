"use client";

import { AudioLines, Info, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { Atmosphere } from "@/components/art/atmosphere";
import { ChatThread } from "@/components/chat/chat-thread";
import { Composer, SuggestionChips } from "@/components/chat/composer";
import { Mascot } from "@/components/companion/mascot";
import { Page } from "@/components/layout/app-shell";
import { usePlayer } from "@/components/player/player-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { useCapabilities } from "@/hooks/use-capabilities";
import { useCompanionChat } from "@/hooks/use-companion-chat";
import { useHydrated } from "@/hooks/use-hydrated";
import { useApp } from "@/lib/store/app-store";
import { cn } from "@/lib/utils";

export default function CompanionPage() {
  const hydrated = useHydrated();
  const caps = useCapabilities();
  const { messages, send, sending, error, clearError } = useCompanionChat();
  const name = useApp((s) => s.preferences.companionName);
  const saveConversations = useApp((s) => s.preferences.saveConversations);
  const clearMessages = useApp((s) => s.clearMessages);
  const player = usePlayer();
  const miniPlayerVisible = Boolean(player.item && !player.expanded);
  const consumed = useRef(false);

  // A prompt handed over from Home (chips or input) is sent once on arrival.
  useEffect(() => {
    if (!hydrated || consumed.current) return;
    consumed.current = true;
    const pending = useApp.getState().pendingPrompt;
    if (pending) {
      useApp.getState().setPendingPrompt(null);
      void send(pending);
    }
  }, [hydrated, send]);

  const empty = hydrated && messages.length === 0 && !sending;

  return (
    <>
      <Atmosphere dim={0.35} />
      <Page className="flex min-h-[calc(100dvh-9rem)] flex-col">
        <header className="sticky top-0 z-20 -mx-4 flex items-center gap-3 px-4 pb-3 pt-[max(env(safe-area-inset-top),16px)] sm:-mx-6 sm:px-6">
          <div className="absolute inset-0 -z-10 border-b border-white/5 bg-night-950/80 backdrop-blur-xl" />
          <Mascot size={52} state={sending ? "thinking" : "idle"} still />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl leading-none">{name}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-white/65">
              <Info className="h-3 w-3" /> AI companion · not a therapist
              {caps?.ai === "demo" && <Badge tone="demo" className="ml-1">Demo</Badge>}
            </p>
          </div>
          <Button asChild size="icon" variant="glass" aria-label="Voice mode">
            <Link href="/companion/voice">
              <AudioLines className="h-5 w-5" />
            </Link>
          </Button>
          {messages.length > 0 && (
            <Button size="icon" variant="ghost" onClick={clearMessages} aria-label="Clear conversation">
              <Trash2 className="h-5 w-5" />
            </Button>
          )}
        </header>

        <div className="flex-1 pb-8 pt-4">
          {empty ? (
            <div className="flex flex-col items-center pt-10 text-center">
              <Mascot size={170} state="waving" label={name} />
              <h2 className="mt-2 font-display text-3xl">What would help right now?</h2>
              <p className="mt-2 max-w-sm text-white/70">Ask for a story, a breathing exercise, some sounds or just a chat. I can start things for you, too.</p>
              <p className="mt-2 text-xs text-white/50">{saveConversations ? "This conversation is kept on your device. You can clear it any time." : "Conversation saving is off: this chat disappears when you leave."}</p>
            </div>
          ) : (
            <ChatThread messages={messages} sending={sending} />
          )}
          {error && (
            <div className="mt-4 rounded-2xl border border-amber-200/30 bg-amber-200/10 p-4 text-sm text-amber-50" role="alert">
              {error}{" "}
              <button className="font-semibold underline" onClick={clearError}>
                Dismiss
              </button>
            </div>
          )}
        </div>

        <div className={cn("sticky z-20 space-y-2 pb-2", miniPlayerVisible ? "bottom-[168px] sm:bottom-24" : "bottom-[96px] sm:bottom-6")}>
          {empty && <SuggestionChips onPick={send} />}
          <Composer onSend={send} disabled={sending} autoFocus={false} />
        </div>
      </Page>
    </>
  );
}
