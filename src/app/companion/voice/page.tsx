"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Keyboard, Mic, MicOff, RotateCcw, Square, Volume2, VolumeX, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Atmosphere } from "@/components/art/atmosphere";
import { Composer } from "@/components/chat/composer";
import { Mascot, type MascotState } from "@/components/companion/mascot";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { loadCapabilities } from "@/hooks/use-capabilities";
import { useClientValue } from "@/hooks/use-client-value";
import { useCompanionChat } from "@/hooks/use-companion-chat";
import { deviceSpeechAvailable, getNarrator, SpeechCancelled, type NarrationBackend } from "@/lib/audio/narrator";
import { getRecognitionCtor, recognitionAvailable, type Recognition } from "@/lib/speech/recognition";
import { useApp } from "@/lib/store/app-store";
import { cn } from "@/lib/utils";

type Phase = "idle" | "listening" | "thinking" | "speaking";

const PHASE_LABEL: Record<Phase, string> = {
  idle: "Tap to talk",
  listening: "Listening…",
  thinking: "Thinking…",
  speaking: "Speaking · tap to interrupt",
};

export default function VoicePage() {
  const { send, applyActions, error } = useCompanionChat();
  const name = useApp((s) => s.preferences.companionName);
  const voice = useApp((s) => s.preferences.voice);
  const voiceReplies = useApp((s) => s.preferences.voiceReplies);
  const updatePreferences = useApp((s) => s.updatePreferences);
  const sttOk = useClientValue(recognitionAvailable, false);
  const [backend, setBackend] = useState<NarrationBackend>("none");
  const [phase, setPhase] = useState<Phase>("idle");
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");
  const [typing, setTyping] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const recRef = useRef<Recognition | null>(null);
  const finalRef = useRef("");

  useEffect(() => {
    loadCapabilities().then((c) => setBackend(c.tts === "elevenlabs" ? "elevenlabs" : deviceSpeechAvailable() ? "device" : "none"));
    return () => {
      recRef.current?.abort();
      getNarrator().cancel();
    };
  }, []);

  const muted = !voiceReplies;
  const canSpeak = backend !== "none";

  const speak = useCallback(
    async (text: string) => {
      if (muted || !canSpeak || !text) return;
      setPhase("speaking");
      try {
        await getNarrator().speak(text, { backend, voice, rate: 1.05 });
      } catch (err) {
        if (!(err instanceof SpeechCancelled) && backend === "elevenlabs" && deviceSpeechAvailable()) {
          setBackend("device");
          await getNarrator().speak(text, { backend: "device", voice, rate: 1.05 }).catch(() => undefined);
        }
      }
      setPhase((p) => (p === "speaking" ? "idle" : p));
    },
    [backend, canSpeak, muted, voice],
  );

  const handleUtterance = useCallback(
    async (text: string) => {
      if (!text.trim()) {
        setPhase("idle");
        return;
      }
      setPhase("thinking");
      setReply("");
      const data = await send(text, { deferActions: true });
      if (!data) {
        setPhase("idle");
        return;
      }
      setReply(data.reply);
      // Speak first, then launch whatever the companion started, so the two don't talk over each other.
      await speak(data.reply);
      applyActions(data.actions);
      setPhase("idle");
    },
    [applyActions, send, speak],
  );

  const startListening = () => {
    getNarrator().cancel();
    setMicError(null);
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setTyping(true);
      return;
    }
    const rec = new Ctor();
    rec.lang = navigator.language || "en-GB";
    rec.interimResults = true;
    rec.continuous = false;
    finalRef.current = "";
    setTranscript("");
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalRef.current += r[0].transcript;
        else interim += r[0].transcript;
      }
      setTranscript((finalRef.current + interim).trim());
    };
    rec.onerror = (e) => {
      setMicError(e.error === "not-allowed" || e.error === "service-not-allowed" ? "Microphone access was blocked. You can allow it in your browser settings, or type instead." : e.error === "no-speech" ? "I didn't catch anything. Tap to try again." : "Voice input stopped unexpectedly.");
      setPhase("idle");
    };
    rec.onend = () => {
      recRef.current = null;
      const said = finalRef.current.trim();
      if (said) void handleUtterance(said);
      else setPhase((p) => (p === "listening" ? "idle" : p));
    };
    recRef.current = rec;
    setPhase("listening");
    try {
      rec.start();
    } catch {
      setPhase("idle");
    }
  };

  const onMascotTap = () => {
    if (phase === "speaking") {
      getNarrator().cancel();
      setPhase("idle");
    } else if (phase === "listening") {
      recRef.current?.stop();
    } else if (phase === "idle") {
      startListening();
    }
  };

  const mascotState: MascotState = phase === "listening" ? "listening" : phase === "thinking" ? "thinking" : phase === "speaking" ? "speaking" : "idle";
  const voiceStatus = muted ? "Voice replies muted" : backend === "elevenlabs" ? "Natural voice" : backend === "device" ? "Device voice" : "No speech output available: replies appear as text";

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <Atmosphere dim={0.3} />
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-8 pt-[max(env(safe-area-inset-top),16px)]">
        <div className="flex items-center justify-between">
          <Button asChild size="icon" variant="glass" aria-label="Close voice mode">
            <Link href="/companion">
              <X className="h-5 w-5" />
            </Link>
          </Button>
          <Badge tone={muted || !canSpeak ? "warn" : "ai"}>{voiceStatus}</Badge>
          <Button size="icon" variant="glass" onClick={() => updatePreferences({ voiceReplies: !voiceReplies })} aria-label={muted ? "Unmute replies" : "Mute replies"} disabled={!canSpeak}>
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </Button>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <button onClick={onMascotTap} disabled={phase === "thinking"} aria-label={PHASE_LABEL[phase]} className="rounded-full">
            <Mascot state={mascotState} size={280} label={name} />
          </button>
          <p className="mt-2 text-sm font-bold uppercase tracking-[0.2em] text-white/70" aria-live="polite">
            {PHASE_LABEL[phase]}
          </p>

          <div className="mt-6 min-h-[120px] w-full space-y-3">
            <AnimatePresence>
              {transcript && (
                <motion.p key="you" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-lg text-white/70">
                  &ldquo;{transcript}&rdquo;
                </motion.p>
              )}
              {reply && (
                <motion.p key={reply} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="font-display text-xl leading-relaxed text-white">
                  {reply}
                </motion.p>
              )}
            </AnimatePresence>
            {(micError || error) && <p className="rounded-2xl bg-amber-200/10 px-4 py-2 text-sm text-amber-100">{micError ?? error}</p>}
            {!sttOk && !typing && <p className="text-sm text-white/60">Voice input isn&apos;t supported in this browser. You can type instead.</p>}
          </div>
        </div>

        {typing && (
          <Composer
            className="mb-4"
            disabled={phase === "thinking"}
            onSend={(t) => {
              setTranscript(t);
              void handleUtterance(t);
            }}
          />
        )}

        <div className="flex items-center justify-center gap-5">
          <Button size="icon" variant="glass" onClick={() => setTyping((v) => !v)} aria-label="Type instead" className={cn(typing && "bg-white/20")}>
            <Keyboard className="h-5 w-5" />
          </Button>
          {phase === "speaking" ? (
            <Button size="icon-lg" variant="primary" onClick={onMascotTap} aria-label="Stop speaking">
              <Square className="h-6 w-6" />
            </Button>
          ) : (
            <Button size="icon-lg" variant="primary" onClick={onMascotTap} disabled={phase === "thinking" || !sttOk} aria-label={phase === "listening" ? "Stop listening" : "Start listening"}>
              {phase === "listening" ? <MicOff className="h-7 w-7" /> : <Mic className="h-7 w-7" />}
            </Button>
          )}
          <Button size="icon" variant="glass" onClick={() => void speak(reply)} disabled={!reply || muted || !canSpeak || phase !== "idle"} aria-label="Replay last reply">
            <RotateCcw className="h-5 w-5" />
          </Button>
        </div>
        <p className="mt-4 text-center text-[11px] text-white/45">
          {sttOk ? "Speech is transcribed by your browser's speech service." : ""} {name} is an AI companion.
        </p>
      </div>
    </div>
  );
}
