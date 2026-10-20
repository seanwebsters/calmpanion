"use client";

import type { VoiceStyle } from "@/lib/types";

// Narration backends:
//  - "elevenlabs": server-proxied natural voice (only when ELEVENLABS_API_KEY is configured)
//  - "device": the browser's built-in speech synthesis
//  - "none": no speech available; the UI switches to read-along text

export type NarrationBackend = "elevenlabs" | "device" | "none";

export function deviceSpeechAvailable() {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
}

const PREFERRED: Record<VoiceStyle, RegExp[]> = {
  warm: [/serena|samantha|libby|sonia|google uk english female|female.*(uk|gb)/i, /female|zira|aria|jenny/i],
  bright: [/karen|moira|tessa|natasha|google us english/i, /female|aria/i],
  deep: [/daniel|arthur|ryan|google uk english male|male.*(uk|gb)/i, /male|david|guy/i],
};

export function pickDeviceVoice(style: VoiceStyle): SpeechSynthesisVoice | undefined {
  if (!deviceSpeechAvailable()) return undefined;
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en"));
  for (const pattern of PREFERRED[style]) {
    const v = voices.find((x) => pattern.test(x.name));
    if (v) return v;
  }
  return voices.find((v) => v.default) ?? voices[0];
}

export class SpeechCancelled extends Error {
  constructor() {
    super("cancelled");
  }
}

class Narrator {
  private audio: HTMLAudioElement | null = null;
  private cancelCurrent: (() => void) | null = null;
  private cache = new Map<string, string>();

  async speak(text: string, opts: { backend: NarrationBackend; voice: VoiceStyle; rate: number; onStart?: () => void }): Promise<void> {
    this.cancel();
    if (opts.backend === "elevenlabs") return this.speakRemote(text, opts);
    if (opts.backend === "device") return this.speakDevice(text, opts);
    throw new Error("No narration backend");
  }

  private speakDevice(text: string, opts: { voice: VoiceStyle; rate: number; onStart?: () => void }) {
    return new Promise<void>((resolve, reject) => {
      const synth = window.speechSynthesis;
      const u = new SpeechSynthesisUtterance(text);
      const v = pickDeviceVoice(opts.voice);
      if (v) u.voice = v;
      u.rate = 0.88 * opts.rate;
      u.pitch = opts.voice === "deep" ? 0.85 : opts.voice === "bright" ? 1.1 : 0.98;
      let settled = false;
      // Chrome can stall long utterances; a keep-alive nudge prevents it.
      const keepAlive = setInterval(() => {
        if (synth.speaking && !synth.paused) {
          synth.pause();
          synth.resume();
        }
      }, 10000);
      const done = (fn: () => void) => {
        if (settled) return;
        settled = true;
        clearInterval(keepAlive);
        this.cancelCurrent = null;
        fn();
      };
      u.onstart = () => opts.onStart?.();
      u.onend = () => done(resolve);
      u.onerror = (e) => done(() => (e.error === "interrupted" || e.error === "canceled" ? reject(new SpeechCancelled()) : reject(new Error(e.error))));
      this.cancelCurrent = () => {
        done(() => reject(new SpeechCancelled()));
        synth.cancel();
      };
      synth.cancel();
      synth.speak(u);
    });
  }

  private async speakRemote(text: string, opts: { voice: VoiceStyle; rate: number; onStart?: () => void }) {
    const key = `${opts.voice}:${text}`;
    let url = this.cache.get(key);
    if (!url) {
      const res = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, voice: opts.voice }) });
      if (!res.ok) throw new Error("tts-failed");
      url = URL.createObjectURL(await res.blob());
      this.cache.set(key, url);
      if (this.cache.size > 60) {
        const first = this.cache.keys().next().value as string;
        URL.revokeObjectURL(this.cache.get(first)!);
        this.cache.delete(first);
      }
    }
    return new Promise<void>((resolve, reject) => {
      const el = this.audio ?? new Audio();
      this.audio = el;
      el.src = url!;
      el.playbackRate = opts.rate;
      let settled = false;
      const done = (fn: () => void) => {
        if (settled) return;
        settled = true;
        this.cancelCurrent = null;
        el.onended = null;
        el.onerror = null;
        fn();
      };
      el.onended = () => done(resolve);
      el.onerror = () => done(() => reject(new Error("playback-failed")));
      this.cancelCurrent = () => {
        el.pause();
        done(() => reject(new SpeechCancelled()));
      };
      el.play()
        .then(() => opts.onStart?.())
        .catch((err) => done(() => reject(err)));
    });
  }

  cancel() {
    this.cancelCurrent?.();
    this.cancelCurrent = null;
    if (deviceSpeechAvailable()) window.speechSynthesis.cancel();
  }
}

let narrator: Narrator | null = null;
export function getNarrator() {
  narrator ??= new Narrator();
  return narrator;
}
