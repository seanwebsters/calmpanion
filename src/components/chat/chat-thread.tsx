"use client";

import { motion } from "framer-motion";
import { AlertCircle, Check, LifeBuoy, Wand2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { Mascot } from "@/components/companion/mascot";
import { ContentRow } from "@/components/content/content-card";
import { resolveContent, useApp } from "@/lib/store/app-store";
import { useUI } from "@/lib/store/ui-store";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

const TOOL_LABEL: Record<string, string> = {
  searchContent: "Searched the library",
  recommendContent: "Found recommendations",
  startSleepStory: "Started a story",
  startMeditation: "Started a meditation",
  startBreathing: "Opened breathing",
  playSoundscape: "Started sounds",
  startFocusSession: "Started focus",
  createRoutine: "Created a routine",
  savePreference: "Memory",
  getRoutine: "Checked routines",
  getRecentSessions: "Checked history",
  openJournal: "Opened journal",
  createPersonalisedStory: "Wrote a story",
};

export function ChatThread({ messages, sending, className }: { messages: ChatMessage[]; sending: boolean; className?: string }) {
  const endRef = useRef<HTMLDivElement>(null);
  const generated = useApp((s) => s.generatedStories);
  const setSupportOpen = useUI((s) => s.setSupportOpen);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, sending]);

  return (
    <div className={cn("space-y-4", className)} aria-live="polite">
      {messages.map((m) => (
        <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
          {m.role === "assistant" && (
            <div className="mt-1 shrink-0">
              <Mascot size={34} still />
            </div>
          )}
          <div className={cn("max-w-[85%] space-y-2", m.role === "user" && "items-end")}>
            <div
              className={cn(
                "rounded-[22px] px-4 py-3 text-[15px] leading-relaxed",
                m.role === "user" ? "rounded-br-md bg-lilac-200 text-night-900" : "glass rounded-bl-md text-white",
              )}
            >
              {m.content}
            </div>
            {m.toolEvents?.map((t, i) => (
              <div key={i} className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold", t.ok ? "bg-sky-300/15 text-sky-200" : "bg-amber-200/10 text-amber-100")}>
                {t.ok ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                {TOOL_LABEL[t.name] ?? t.name}: {t.summary}
              </div>
            ))}
            {m.contentIds?.map((id) => {
              const item = resolveContent(id, generated);
              return item ? <ContentRow key={id} item={item} /> : null;
            })}
            {m.support && (
              <button onClick={() => setSupportOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-peach-300/15 px-3 py-1.5 text-xs font-semibold text-peach-200">
                <LifeBuoy className="h-3.5 w-3.5" /> Support options
              </button>
            )}
            {m.role === "assistant" && m.provider === "demo" && (
              <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-white/35">
                <Wand2 className="h-3 w-3" /> Demo companion
              </p>
            )}
          </div>
        </motion.div>
      ))}
      {sending && (
        <div className="flex items-center gap-2">
          <Mascot size={34} state="thinking" still />
          <div className="glass flex gap-1 rounded-[22px] rounded-bl-md px-4 py-3">
            {[0, 1, 2].map((i) => (
              <motion.span key={i} className="h-2 w-2 rounded-full bg-white/70" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />
            ))}
          </div>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
