"use client";

import { Mic, SendHorizontal } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function Composer({
  onSend,
  disabled,
  placeholder = "Talk to your companion…",
  className,
  autoFocus,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState("");
  const submit = () => {
    if (!text.trim() || disabled) return;
    onSend(text);
    setText("");
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className={cn("glass-strong flex items-center gap-2 rounded-full p-1.5 pl-5", className)}
    >
      <label htmlFor="companion-input" className="sr-only">
        Message your companion
      </label>
      <input
        id="companion-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        maxLength={2000}
        className="min-w-0 flex-1 bg-transparent text-[15px] text-white placeholder:text-white/45 focus:outline-none"
      />
      <Link href="/companion/voice" aria-label="Voice mode" className="flex h-11 w-11 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white">
        <Mic className="h-5 w-5" />
      </Link>
      <button
        type="submit"
        disabled={!text.trim() || disabled}
        aria-label="Send"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-lilac-200 to-peach-200 text-night-900 transition active:scale-95 disabled:opacity-40"
      >
        <SendHorizontal className="h-5 w-5" />
      </button>
    </form>
  );
}

export const SUGGESTIONS = ["Help me sleep", "I'm feeling stressed", "Tell me a story", "Let's breathe", "Play relaxing sounds", "Help me focus", "Just chat"];

export function SuggestionChips({ onPick, items = SUGGESTIONS, className }: { onPick: (s: string) => void; items?: string[]; className?: string }) {
  return (
    <div className={cn("-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0", className)}>
      {items.map((s) => (
        <button
          key={s}
          onClick={() => onPick(s)}
          className="glass shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15 active:scale-95"
        >
          {s}
        </button>
      ))}
    </div>
  );
}
