"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { loadCapabilities } from "@/hooks/use-capabilities";
import { getAudioEngine } from "@/lib/audio/engine";
import { deviceSpeechAvailable, getNarrator, SpeechCancelled, type NarrationBackend } from "@/lib/audio/narrator";
import { contentMinutes, estimateScriptSeconds } from "@/lib/content/catalog";
import { getPreset } from "@/lib/content/sounds";
import { resolveContent, useApp } from "@/lib/store/app-store";
import type { ContentItem } from "@/lib/types";

export type PlayerStatus = "idle" | "loading" | "playing" | "paused" | "ended";

interface PlayerContextValue {
  item: ContentItem | null;
  status: PlayerStatus;
  segIndex: number;
  elapsed: number;
  duration: number;
  speed: number;
  backend: NarrationBackend;
  availableBackends: NarrationBackend[];
  expanded: boolean;
  ambienceOn: boolean;
  ambienceVolume: number;
  sleepTimerEndsAt: number | null;
  notice: string | null;
  play: (idOrItem: string | ContentItem, opts?: { fromSegment?: number }) => void;
  toggle: () => void;
  pause: () => void;
  stop: () => void;
  seekSegment: (i: number) => void;
  setSpeed: (s: number) => void;
  setBackend: (b: NarrationBackend) => void;
  setExpanded: (v: boolean) => void;
  setAmbience: (on: boolean) => void;
  setAmbienceVolume: (v: number) => void;
  setSleepTimer: (minutes: number | null) => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used inside PlayerProvider");
  return ctx;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [item, setItem] = useState<ContentItem | null>(null);
  const [status, setStatus] = useState<PlayerStatus>("idle");
  const [segIndex, setSegIndex] = useState(0);
  const [segStartedAt, setSegStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [speed, setSpeedState] = useState(1);
  const [backend, setBackendState] = useState<NarrationBackend>("none");
  const [availableBackends, setAvailable] = useState<NarrationBackend[]>(["none"]);
  const [expanded, setExpanded] = useState(false);
  const [ambienceOn, setAmbienceOn] = useState(true);
  const [ambienceVolume, setAmbienceVolumeState] = useState(0.55);
  const [sleepTimerEndsAt, setSleepTimerEndsAt] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const runId = useRef(0);
  const sessionId = useRef<string | null>(null);
  const ambienceStarted = useRef(false);
  const sleepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef({ item, segIndex, speed, backend, status, ambienceOn, ambienceVolume });
  useEffect(() => {
    stateRef.current = { item, segIndex, speed, backend, status, ambienceOn, ambienceVolume };
  });

  // Work out which narration backends are really available.
  useEffect(() => {
    loadCapabilities().then((caps) => {
      const list: NarrationBackend[] = [];
      if (caps.tts === "elevenlabs") list.push("elevenlabs");
      if (deviceSpeechAvailable()) list.push("device");
      list.push("none");
      setAvailable(list);
      setBackendState(list[0]);
    });
  }, []);

  const durations = useMemo(() => (item ? estimateScriptSeconds(item.script, speed) : []), [item, speed]);
  const duration = durations.reduce((a, b) => a + b, 0);
  const elapsedBase = durations.slice(0, segIndex).reduce((a, b) => a + b, 0);
  const segElapsed = status === "playing" && segStartedAt ? Math.min(durations[segIndex] ?? 0, (now - segStartedAt) / 1000) : 0;
  const elapsed = status === "ended" ? duration : elapsedBase + segElapsed;

  useEffect(() => {
    if (status !== "playing") return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [status]);

  // Persist progress for "continue listening".
  useEffect(() => {
    if (!sessionId.current || !item || duration <= 0) return;
    const progress = Math.min(1, elapsed / duration);
    useApp.getState().updateSession(sessionId.current, { progress: Math.round(progress * 100) / 100 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segIndex, status]);

  const startAmbience = useCallback(async (it: ContentItem) => {
    const s = stateRef.current;
    if (!s.ambienceOn || !it.ambiencePresetId) return;
    const preset = getPreset(it.ambiencePresetId);
    if (!preset) return;
    const engine = getAudioEngine();
    // Don't override a soundscape the user is already mixing.
    if (engine.isPlaying() && !ambienceStarted.current) return;
    await engine.setMix(preset.layers.map((l) => ({ ...l, volume: l.volume * s.ambienceVolume })));
    ambienceStarted.current = true;
  }, []);

  const stopAmbience = useCallback(() => {
    if (ambienceStarted.current) getAudioEngine().stopAll();
    ambienceStarted.current = false;
    getAudioEngine().duck(1);
  }, []);

  const finish = useCallback(() => {
    setStatus("ended");
    setSegStartedAt(null);
    if (sessionId.current) useApp.getState().updateSession(sessionId.current, { progress: 1, completedAt: new Date().toISOString() });
    if (ambienceStarted.current) getAudioEngine().fadeOutAndStop(15);
    ambienceStarted.current = false;
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "none";
  }, []);

  const runFrom = useCallback(
    async (it: ContentItem, from: number) => {
      const my = ++runId.current;
      const narrator = getNarrator();
      setStatus("playing");
      if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
      for (let i = from; i < it.script.length; i++) {
        if (runId.current !== my) return;
        const seg = it.script[i];
        const { speed: sp, backend: be } = stateRef.current;
        setSegIndex(i);
        setSegStartedAt(Date.now());
        setNow(Date.now());
        try {
          if (be === "none") {
            await wait((seg.text.split(/\s+/).length / 130) * 60_000 / sp);
          } else {
            getAudioEngine().duck(0.55);
            await narrator.speak(seg.text, { backend: be, voice: useApp.getState().preferences.voice, rate: sp });
          }
        } catch (err) {
          if (err instanceof SpeechCancelled || runId.current !== my) return;
          // Remote voice failed: fall back to the device voice honestly, or read-along.
          const fallback: NarrationBackend = be === "elevenlabs" && deviceSpeechAvailable() ? "device" : "none";
          setBackendState(fallback);
          setNotice(fallback === "device" ? "Natural voice is unavailable right now, so your device's voice is reading instead." : "Voice playback isn't available here, so we've switched to read-along.");
          i--;
          continue;
        }
        getAudioEngine().duck(1);
        if (runId.current !== my) return;
        await wait((seg.pauseSec * 1000) / sp);
      }
      if (runId.current === my) finish();
    },
    [finish],
  );

  const play = useCallback(
    (idOrItem: string | ContentItem, opts?: { fromSegment?: number }) => {
      const state = useApp.getState();
      const it = typeof idOrItem === "string" ? resolveContent(idOrItem, state.generatedStories) : idOrItem;
      if (!it) {
        setNotice("That session couldn't be found.");
        return;
      }
      // Non-narrated content opens its dedicated studio.
      if (it.kind === "breathing") {
        state.setPendingLaunch({ type: "breathing", pattern: it.breathingPatternId ?? "gentle", minutes: it.fixedMinutes ?? 3, autostart: false });
        router.push("/breathe");
        return;
      }
      if (it.kind === "activity" && it.activityId) {
        router.push(`/activities/${it.activityId}`);
        return;
      }
      if (it.kind === "focus") {
        state.setPendingLaunch({ type: "focus", minutes: it.fixedMinutes ?? 25, presetId: it.ambiencePresetId, autostart: false });
        router.push("/focus");
        return;
      }
      if (it.kind === "soundscape") {
        const preset = it.ambiencePresetId ? getPreset(it.ambiencePresetId) : undefined;
        if (preset) {
          void getAudioEngine().setMix(preset.layers);
          state.startSession(it, 0);
        }
        router.push("/sounds");
        return;
      }

      getNarrator().cancel();
      runId.current++;
      void getAudioEngine().unlock();
      setNotice(null);
      setItem(it);
      setExpanded(true);
      setStatus("loading");
      const from = opts?.fromSegment ?? 0;
      setSegIndex(from);
      sessionId.current = state.startSession(it, contentMinutes(it));
      if ("mediaSession" in navigator && typeof MediaMetadata !== "undefined") {
        navigator.mediaSession.metadata = new MediaMetadata({ title: it.title, artist: it.narrator, album: "Calm Companion" });
      }
      void startAmbience(it);
      void runFrom(it, from);
    },
    [router, runFrom, startAmbience],
  );

  const pause = useCallback(() => {
    runId.current++;
    getNarrator().cancel();
    getAudioEngine().duck(1);
    setStatus((s) => (s === "playing" || s === "loading" ? "paused" : s));
    setSegStartedAt(null);
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
  }, []);

  const resume = useCallback(() => {
    const { item: it, segIndex: i } = stateRef.current;
    if (!it) return;
    void startAmbience(it);
    void runFrom(it, i);
  }, [runFrom, startAmbience]);

  const toggle = useCallback(() => {
    const s = stateRef.current.status;
    if (s === "playing" || s === "loading") pause();
    else if (s === "ended" && stateRef.current.item) play(stateRef.current.item);
    else resume();
  }, [pause, play, resume]);

  const stop = useCallback(() => {
    runId.current++;
    getNarrator().cancel();
    stopAmbience();
    setItem(null);
    setStatus("idle");
    setExpanded(false);
    sessionId.current = null;
    if (sleepTimer.current) clearTimeout(sleepTimer.current);
    setSleepTimerEndsAt(null);
  }, [stopAmbience]);

  const seekSegment = useCallback(
    (i: number) => {
      const it = stateRef.current.item;
      if (!it) return;
      const idx = Math.max(0, Math.min(it.script.length - 1, i));
      getNarrator().cancel();
      if (stateRef.current.status === "playing" || stateRef.current.status === "loading") void runFrom(it, idx);
      else {
        runId.current++;
        setSegIndex(idx);
        setStatus("paused");
      }
    },
    [runFrom],
  );

  const setSpeed = useCallback(
    (s: number) => {
      setSpeedState(s);
      stateRef.current.speed = s;
      if (stateRef.current.status === "playing" && stateRef.current.item) {
        getNarrator().cancel();
        void runFrom(stateRef.current.item, stateRef.current.segIndex);
      }
    },
    [runFrom],
  );

  const setBackend = useCallback(
    (b: NarrationBackend) => {
      setBackendState(b);
      stateRef.current.backend = b;
      setNotice(null);
      if (stateRef.current.status === "playing" && stateRef.current.item) {
        getNarrator().cancel();
        void runFrom(stateRef.current.item, stateRef.current.segIndex);
      }
    },
    [runFrom],
  );

  const setAmbience = useCallback(
    (on: boolean) => {
      setAmbienceOn(on);
      stateRef.current.ambienceOn = on;
      if (!on) stopAmbience();
      else if (stateRef.current.item && stateRef.current.status === "playing") void startAmbience(stateRef.current.item);
    },
    [startAmbience, stopAmbience],
  );

  const setAmbienceVolume = useCallback((v: number) => {
    setAmbienceVolumeState(v);
    stateRef.current.ambienceVolume = v;
    const it = stateRef.current.item;
    if (ambienceStarted.current && it?.ambiencePresetId) {
      const preset = getPreset(it.ambiencePresetId);
      if (preset) void getAudioEngine().setMix(preset.layers.map((l) => ({ ...l, volume: l.volume * v })));
    }
  }, []);

  const setSleepTimer = useCallback(
    (minutes: number | null) => {
      if (sleepTimer.current) clearTimeout(sleepTimer.current);
      if (!minutes) {
        setSleepTimerEndsAt(null);
        return;
      }
      setSleepTimerEndsAt(Date.now() + minutes * 60_000);
      sleepTimer.current = setTimeout(() => {
        pause();
        if (ambienceStarted.current) getAudioEngine().fadeOutAndStop(20);
        ambienceStarted.current = false;
        setSleepTimerEndsAt(null);
      }, minutes * 60_000);
    },
    [pause],
  );

  // Lock-screen / headphone controls where supported.
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    const set = (a: MediaSessionAction, h: MediaSessionActionHandler | null) => {
      try {
        ms.setActionHandler(a, h);
      } catch {
        /* unsupported action */
      }
    };
    set("play", () => toggle());
    set("pause", () => pause());
    set("previoustrack", () => seekSegment(stateRef.current.segIndex - 1));
    set("nexttrack", () => seekSegment(stateRef.current.segIndex + 1));
    set("stop", () => stop());
  }, [toggle, pause, seekSegment, stop]);

  const value: PlayerContextValue = {
    item,
    status,
    segIndex,
    elapsed,
    duration,
    speed,
    backend,
    availableBackends,
    expanded,
    ambienceOn,
    ambienceVolume,
    sleepTimerEndsAt,
    notice,
    play,
    toggle,
    pause,
    stop,
    seekSegment,
    setSpeed,
    setBackend,
    setExpanded,
    setAmbience,
    setAmbienceVolume,
    setSleepTimer,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}
