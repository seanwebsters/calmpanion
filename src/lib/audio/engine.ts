"use client";

import { getSound } from "@/lib/content/sounds";
import type { SoundId, SoundLayerSetting } from "@/lib/types";

// Every ambient layer is synthesised live with the Web Audio API: original, royalty-free
// and playable offline. File-based layers are supported for licensed recordings, and report
// themselves unavailable when the file is missing rather than pretending to play.

interface LayerHandle {
  gain: GainNode;
  stop: () => void;
}

export interface MixerState {
  available: boolean;
  playing: Partial<Record<SoundId, number>>;
  masterVolume: number;
  timerEndsAt: number | null;
  unavailable: SoundId[];
}

type Listener = (s: MixerState) => void;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private mixBus: GainNode | null = null;
  private reverb: ConvolverNode | null = null;
  private buffers: Partial<Record<"white" | "pink" | "brown", AudioBuffer>> = {};
  private layers = new Map<SoundId, LayerHandle>();
  private volumes: Partial<Record<SoundId, number>> = {};
  private listeners = new Set<Listener>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private timerEndsAt: number | null = null;
  private masterVolume = 0.8;
  private unavailable = new Set<SoundId>();
  private duckLevel = 1;

  get supported() {
    return typeof window !== "undefined" && ("AudioContext" in window || "webkitAudioContext" in window);
  }

  /** Must be called from a user gesture at least once (browser autoplay rules). */
  async unlock(): Promise<boolean> {
    if (!this.supported) return false;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.masterVolume;
      this.master.connect(this.ctx.destination);
      this.mixBus = this.ctx.createGain();
      this.mixBus.connect(this.master);
      this.reverb = this.ctx.createConvolver();
      this.reverb.buffer = this.impulse(3.2);
      const wet = this.ctx.createGain();
      wet.gain.value = 0.45;
      this.reverb.connect(wet).connect(this.mixBus);
    }
    if (this.ctx.state === "suspended") await this.ctx.resume().catch(() => undefined);
    return this.ctx.state === "running";
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    fn(this.state());
    return () => {
      this.listeners.delete(fn);
    };
  }

  state(): MixerState {
    return {
      available: this.supported,
      playing: { ...this.volumes },
      masterVolume: this.masterVolume,
      timerEndsAt: this.timerEndsAt,
      unavailable: [...this.unavailable],
    };
  }

  private emit() {
    const s = this.state();
    this.listeners.forEach((l) => l(s));
  }

  isPlaying() {
    return this.layers.size > 0;
  }

  async setMix(layers: SoundLayerSetting[]) {
    if (!(await this.unlock())) return false;
    const wanted = new Map(layers.map((l) => [l.soundId, l.volume]));
    for (const id of [...this.layers.keys()]) if (!wanted.has(id)) this.stopLayer(id);
    for (const [id, vol] of wanted) await this.setLayer(id, vol);
    this.emit();
    return true;
  }

  async setLayer(id: SoundId, volume: number) {
    if (!(await this.unlock()) || !this.ctx) return false;
    if (volume <= 0) {
      this.stopLayer(id);
      this.emit();
      return true;
    }
    let handle = this.layers.get(id);
    if (!handle) {
      const created = await this.createLayer(id);
      if (!created) {
        this.unavailable.add(id);
        this.emit();
        return false;
      }
      handle = created;
      this.layers.set(id, handle);
      handle.gain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
    handle.gain.gain.cancelScheduledValues(this.ctx.currentTime);
    handle.gain.gain.setTargetAtTime(volume * volume, this.ctx.currentTime, 0.4);
    this.volumes[id] = volume;
    this.emit();
    return true;
  }

  stopLayer(id: SoundId) {
    const h = this.layers.get(id);
    if (!h || !this.ctx) return;
    const t = this.ctx.currentTime;
    h.gain.gain.cancelScheduledValues(t);
    h.gain.gain.setTargetAtTime(0, t, 0.3);
    setTimeout(() => h.stop(), 1500);
    this.layers.delete(id);
    delete this.volumes[id];
  }

  stopAll() {
    for (const id of [...this.layers.keys()]) this.stopLayer(id);
    this.clearTimer();
    this.emit();
  }

  setMasterVolume(v: number) {
    this.masterVolume = v;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(v * this.duckLevel, this.ctx.currentTime, 0.1);
    this.emit();
  }

  /** Lower ambience under narration. */
  duck(level: number) {
    this.duckLevel = level;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.masterVolume * level, this.ctx.currentTime, 0.5);
  }

  setTimer(minutes: number | null) {
    this.clearTimer();
    if (minutes && minutes > 0) {
      this.timerEndsAt = Date.now() + minutes * 60_000;
      this.timer = setTimeout(() => this.fadeOutAndStop(20), minutes * 60_000);
    }
    this.emit();
  }

  private clearTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.timerEndsAt = null;
  }

  fadeOutAndStop(seconds: number) {
    if (!this.ctx || !this.mixBus) return;
    const t = this.ctx.currentTime;
    this.mixBus.gain.cancelScheduledValues(t);
    this.mixBus.gain.setValueAtTime(this.mixBus.gain.value, t);
    this.mixBus.gain.linearRampToValueAtTime(0, t + seconds);
    setTimeout(() => {
      this.stopAll();
      if (this.mixBus && this.ctx) this.mixBus.gain.setValueAtTime(1, this.ctx.currentTime);
    }, seconds * 1000 + 100);
  }

  /** A soft bell, used for breathing cues and timer endings. */
  async chime(freq = 528, volume = 0.18, duration = 2.5) {
    if (!(await this.unlock()) || !this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const out = this.ctx.createGain();
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(volume, t + 0.02);
    out.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    out.connect(this.master);
    if (this.reverb) out.connect(this.reverb);
    [1, 2.01, 3.02].forEach((mult, i) => {
      const o = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      o.type = "sine";
      o.frequency.value = freq * mult;
      g.gain.value = [1, 0.25, 0.08][i];
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + duration + 0.1);
    });
  }

  /** Check whether a file-based layer's asset actually exists. */
  async fileAvailable(id: SoundId) {
    const def = getSound(id);
    if (!def || def.type !== "file" || !def.src) return def?.type === "synth";
    try {
      const res = await fetch(def.src, { method: "HEAD" });
      return res.ok && (res.headers.get("content-type") ?? "").startsWith("audio");
    } catch {
      return false;
    }
  }

  // ---------------- synthesis ----------------

  private noise(kind: "white" | "pink" | "brown"): AudioBuffer {
    const ctx = this.ctx!;
    const cached = this.buffers[kind];
    if (cached) return cached;
    const len = ctx.sampleRate * 8;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        if (kind === "white") d[i] = w * 0.5;
        else if (kind === "pink") {
          b0 = 0.99886 * b0 + w * 0.0555179;
          b1 = 0.99332 * b1 + w * 0.0750759;
          b2 = 0.969 * b2 + w * 0.153852;
          b3 = 0.8665 * b3 + w * 0.3104856;
          b4 = 0.55 * b4 + w * 0.5329522;
          b5 = -0.7616 * b5 - w * 0.016898;
          d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
          b6 = w * 0.115926;
        } else {
          last = (last + 0.02 * w) / 1.02;
          d[i] = last * 3.5;
        }
      }
    }
    this.buffers[kind] = buf;
    return buf;
  }

  private impulse(seconds: number) {
    const ctx = this.ctx!;
    const len = ctx.sampleRate * seconds;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
    }
    return buf;
  }

  private loopSource(kind: "white" | "pink" | "brown") {
    const src = this.ctx!.createBufferSource();
    src.buffer = this.noise(kind);
    src.loop = true;
    src.loopStart = Math.random() * 4;
    src.start(0, Math.random() * 7);
    return src;
  }

  private lfo(freq: number, depth: number, target: AudioParam) {
    const o = this.ctx!.createOscillator();
    const g = this.ctx!.createGain();
    o.frequency.value = freq;
    g.gain.value = depth;
    o.connect(g).connect(target);
    o.start();
    return o;
  }

  private async createLayer(id: SoundId): Promise<LayerHandle | null> {
    const ctx = this.ctx!;
    const out = ctx.createGain();
    out.connect(this.mixBus!);
    const stops: (() => void)[] = [];
    const intervals: ReturnType<typeof setInterval>[] = [];
    const nodes: AudioScheduledSourceNode[] = [];
    const filter = (type: BiquadFilterType, freq: number, q = 0.7) => {
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      return f;
    };

    switch (id) {
      case "rain": {
        const src = this.loopSource("pink");
        const hp = filter("highpass", 400);
        const lp = filter("lowpass", 6500);
        const g = ctx.createGain();
        g.gain.value = 0.9;
        src.connect(hp).connect(lp).connect(g).connect(out);
        nodes.push(src);
        // scattered droplets
        intervals.push(
          setInterval(() => {
            if (Math.random() > 0.55) return;
            const t = ctx.currentTime + Math.random() * 0.05;
            const drop = ctx.createBufferSource();
            drop.buffer = this.noise("white");
            const bp = filter("bandpass", 2000 + Math.random() * 4000, 4);
            const dg = ctx.createGain();
            dg.gain.setValueAtTime(0, t);
            dg.gain.linearRampToValueAtTime(0.12 + Math.random() * 0.2, t + 0.004);
            dg.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
            drop.connect(bp).connect(dg).connect(out);
            drop.start(t, Math.random() * 6, 0.08);
          }, 45),
        );
        break;
      }
      case "ocean": {
        const src = this.loopSource("brown");
        const lp = filter("lowpass", 700);
        const swell = ctx.createGain();
        swell.gain.value = 0.55;
        src.connect(lp).connect(swell).connect(out);
        const foam = this.loopSource("pink");
        const fhp = filter("bandpass", 1800, 0.5);
        const fg = ctx.createGain();
        fg.gain.value = 0.12;
        foam.connect(fhp).connect(fg).connect(out);
        nodes.push(src, foam, this.lfo(0.075, 0.45, swell.gain), this.lfo(0.075, 400, lp.frequency), this.lfo(0.075, 0.1, fg.gain));
        break;
      }
      case "wind": {
        const src = this.loopSource("pink");
        const bp = filter("bandpass", 520, 0.9);
        const g = ctx.createGain();
        g.gain.value = 0.7;
        src.connect(bp).connect(g).connect(out);
        nodes.push(src, this.lfo(0.045, 280, bp.frequency), this.lfo(0.11, 0.3, g.gain));
        break;
      }
      case "white-noise": {
        const src = this.loopSource("white");
        const lp = filter("lowpass", 9000);
        const g = ctx.createGain();
        g.gain.value = 0.35;
        src.connect(lp).connect(g).connect(out);
        nodes.push(src);
        break;
      }
      case "brown-noise": {
        const src = this.loopSource("brown");
        const lp = filter("lowpass", 500);
        src.connect(lp).connect(out);
        nodes.push(src);
        break;
      }
      case "stream": {
        const src = this.loopSource("white");
        const bp1 = filter("bandpass", 1300, 0.6);
        const bp2 = filter("bandpass", 3200, 1.2);
        const g1 = ctx.createGain();
        const g2 = ctx.createGain();
        g1.gain.value = 0.35;
        g2.gain.value = 0.12;
        src.connect(bp1).connect(g1).connect(out);
        src.connect(bp2).connect(g2).connect(out);
        nodes.push(src, this.lfo(0.9, 350, bp1.frequency), this.lfo(1.7, 800, bp2.frequency), this.lfo(0.3, 0.1, g1.gain));
        break;
      }
      case "forest": {
        const hush = this.loopSource("pink");
        const hp = filter("highpass", 1200);
        const hg = ctx.createGain();
        hg.gain.value = 0.12;
        hush.connect(hp).connect(hg).connect(out);
        nodes.push(hush, this.lfo(0.08, 0.06, hg.gain));
        const chirp = () => {
          const t0 = ctx.currentTime + 0.05;
          const notes = 2 + Math.floor(Math.random() * 4);
          const base = 2200 + Math.random() * 1800;
          const pan = ctx.createStereoPanner();
          pan.pan.value = Math.random() * 1.6 - 0.8;
          pan.connect(out);
          for (let n = 0; n < notes; n++) {
            const t = t0 + n * (0.09 + Math.random() * 0.08);
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = "sine";
            o.frequency.setValueAtTime(base, t);
            o.frequency.exponentialRampToValueAtTime(base * (1.2 + Math.random() * 0.5), t + 0.06);
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.05, t + 0.01);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
            o.connect(g).connect(pan);
            o.start(t);
            o.stop(t + 0.12);
          }
        };
        intervals.push(setInterval(() => Math.random() < 0.35 && chirp(), 900));
        break;
      }
      case "crickets": {
        const carrier = ctx.createOscillator();
        carrier.frequency.value = 4400;
        const am = ctx.createGain();
        am.gain.value = 0;
        const pulse = ctx.createOscillator();
        pulse.type = "square";
        pulse.frequency.value = 28;
        const pg = ctx.createGain();
        pg.gain.value = 0.5;
        pulse.connect(pg).connect(am.gain);
        const burst = ctx.createGain();
        burst.gain.value = 0;
        carrier.connect(am).connect(burst);
        const lp = filter("lowpass", 6000);
        const g = ctx.createGain();
        g.gain.value = 0.06;
        burst.connect(lp).connect(g).connect(out);
        carrier.start();
        pulse.start();
        nodes.push(carrier, pulse);
        const night = this.loopSource("brown");
        const ng = ctx.createGain();
        ng.gain.value = 0.15;
        night.connect(filter("lowpass", 300)).connect(ng).connect(out);
        nodes.push(night);
        intervals.push(
          setInterval(() => {
            const t = ctx.currentTime + 0.02;
            burst.gain.setValueAtTime(0, t);
            burst.gain.linearRampToValueAtTime(1, t + 0.03);
            burst.gain.setValueAtTime(1, t + 0.18);
            burst.gain.linearRampToValueAtTime(0, t + 0.22);
          }, 650),
        );
        break;
      }
      case "piano": {
        const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99];
        const dry = ctx.createGain();
        dry.gain.value = 0.6;
        dry.connect(out);
        // Send the layer's own output to the shared reverb so its volume control covers the tail too.
        out.connect(this.reverb!);
        const note = (freq: number, t: number, vel: number) => {
          const g = ctx.createGain();
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(vel, t + 0.015);
          g.gain.exponentialRampToValueAtTime(vel * 0.3, t + 1.2);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 5);
          const lp = filter("lowpass", 2400);
          [
            ["triangle", 1, 1],
            ["sine", 2, 0.25],
            ["sine", 0.5, 0.2],
          ].forEach(([type, mult, amp]) => {
            const o = ctx.createOscillator();
            const og = ctx.createGain();
            o.type = type as OscillatorType;
            o.frequency.value = freq * (mult as number);
            og.gain.value = amp as number;
            o.connect(og).connect(lp);
            o.start(t);
            o.stop(t + 5.2);
          });
          lp.connect(g);
          g.connect(dry);
        };
        const play = () => {
          const t = ctx.currentTime + 0.05;
          const i = Math.floor(Math.random() * scale.length);
          note(scale[i] / (Math.random() < 0.3 ? 2 : 1), t, 0.12);
          if (Math.random() < 0.35) note(scale[Math.max(0, i - 2)] / 2, t + 0.02, 0.07);
        };
        play();
        intervals.push(setInterval(() => Math.random() < 0.6 && play(), 1400));
        break;
      }
      case "thunder-recording": {
        const def = getSound(id);
        if (!def?.src || !(await this.fileAvailable(id))) return null;
        const el = new Audio(def.src);
        el.loop = true;
        el.crossOrigin = "anonymous";
        const node = ctx.createMediaElementSource(el);
        node.connect(out);
        await el.play().catch(() => undefined);
        stops.push(() => {
          el.pause();
          node.disconnect();
        });
        break;
      }
      default:
        return null;
    }

    return {
      gain: out,
      stop: () => {
        intervals.forEach(clearInterval);
        nodes.forEach((n) => {
          try {
            n.stop();
          } catch {
            /* already stopped */
          }
        });
        stops.forEach((s) => s());
        out.disconnect();
      },
    };
  }
}

let engine: AudioEngine | null = null;
export function getAudioEngine() {
  engine ??= new AudioEngine();
  return engine;
}
