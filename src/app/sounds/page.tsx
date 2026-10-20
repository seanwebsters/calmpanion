"use client";

import { Heart, Moon, Square, Trash2, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Atmosphere } from "@/components/art/atmosphere";
import { Landscape } from "@/components/art/landscape";
import { Page } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Badge, Card, Chip, inputClass, PageHeader, SectionHeader } from "@/components/ui/misc";
import { Slider } from "@/components/ui/slider";
import { useMixer } from "@/hooks/use-mixer";
import { useNow } from "@/hooks/use-now";
import { getAudioEngine } from "@/lib/audio/engine";
import { getContent } from "@/lib/content/catalog";
import { SOUND_PRESETS, SOUNDS } from "@/lib/content/sounds";
import { useApp } from "@/lib/store/app-store";
import type { SoundId, SoundLayerSetting } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function SoundsPage() {
  const mixer = useMixer();
  const saved = useApp((s) => s.soundFavourites);
  const saveMix = useApp((s) => s.saveSoundMix);
  const deleteMix = useApp((s) => s.deleteSoundMix);
  const [fileOk, setFileOk] = useState<Partial<Record<SoundId, boolean>>>({});
  const [mixName, setMixName] = useState("");
  const engine = getAudioEngine();
  const playing = Object.keys(mixer.playing) as SoundId[];

  // Check whether file-based (licensed) layers actually have an asset.
  useEffect(() => {
    SOUNDS.filter((s) => s.type === "file").forEach((s) => engine.fileAvailable(s.id).then((ok) => setFileOk((f) => ({ ...f, [s.id]: ok }))));
  }, [engine]);

  const now = useNow(15_000, Boolean(mixer.timerEndsAt));

  const loadPreset = (layers: SoundLayerSetting[], presetId?: string) => {
    void engine.setMix(layers);
    const item = presetId ? getContent(`sound-${presetId}`) : undefined;
    if (item) useApp.getState().startSession(item, 0);
  };

  const currentLayers: SoundLayerSetting[] = playing.map((id) => ({ soundId: id, volume: mixer.playing[id] ?? 0.5 }));
  const minutesLeft = mixer.timerEndsAt ? Math.max(1, Math.round((mixer.timerEndsAt - now) / 60000)) : null;

  return (
    <>
      <Atmosphere dim={0.5} />
      <Page wide>
        <PageHeader title="Soundscapes" subtitle="Mix your own calm. Every sound is generated live in your browser.">
          {playing.length > 0 && (
            <Button variant="glass" size="sm" onClick={() => engine.stopAll()}>
              <Square className="h-4 w-4" /> Stop
            </Button>
          )}
        </PageHeader>

        {!mixer.available && <Card className="mb-6 border-amber-200/30 text-amber-50">This browser doesn&apos;t support the Web Audio API, so soundscapes can&apos;t play here.</Card>}

        <section>
          <SectionHeader title="Presets" />
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-none sm:-mx-6 sm:px-6">
            {SOUND_PRESETS.map((p) => {
              const active = p.layers.every((l) => mixer.playing[l.soundId] !== undefined) && playing.length === p.layers.length;
              return (
                <button key={p.id} onClick={() => loadPreset(p.layers, p.id)} className={cn("relative h-36 w-36 shrink-0 overflow-hidden rounded-[22px] text-left ring-2 transition", active ? "ring-lilac-200" : "ring-transparent")}>
                  <Landscape spec={p.artwork} seed={p.id} />
                  <div className="absolute inset-0 bg-gradient-to-t from-night-950/85 to-transparent" />
                  <div className="absolute bottom-2.5 left-3 right-3">
                    <p className="font-semibold leading-tight">{p.name}</p>
                    <p className="text-[11px] text-white/70">{p.description}</p>
                  </div>
                  {active && <Volume2 className="absolute right-3 top-3 h-4 w-4" aria-label="Playing" />}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-8">
          <SectionHeader title="Mixer" />
          <div className="grid gap-3 sm:grid-cols-2">
            {SOUNDS.map((s) => {
              const vol = mixer.playing[s.id];
              const on = vol !== undefined;
              const unavailable = (s.type === "file" && fileOk[s.id] === false) || mixer.unavailable.includes(s.id);
              return (
                <div key={s.id} className={cn("glass flex items-center gap-3 rounded-[22px] p-3", on && "bg-white/15", unavailable && "opacity-60")}>
                  <button
                    disabled={unavailable || !mixer.available}
                    onClick={() => (on ? engine.setLayer(s.id, 0) : engine.setLayer(s.id, 0.5))}
                    aria-pressed={on}
                    aria-label={`${on ? "Turn off" : "Turn on"} ${s.name}`}
                    className={cn("relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl ring-2 transition", on ? "ring-lilac-200" : "ring-transparent")}
                  >
                    <Landscape spec={s.artwork} seed={s.id} />
                    {on && <span className="absolute inset-0 flex items-center justify-center bg-night-950/30"><Volume2 className="h-5 w-5" /></span>}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold">{s.name}</p>
                      {s.type === "file" && <Badge tone={unavailable ? "warn" : "default"}>{unavailable ? "Unavailable" : "Recording"}</Badge>}
                    </div>
                    {unavailable ? (
                      <p className="text-xs text-white/60">No licensed recording has been supplied, so this layer can&apos;t play.</p>
                    ) : on ? (
                      <Slider value={[vol]} min={0.05} max={1} step={0.01} onValueChange={([v]) => engine.setLayer(s.id, v)} aria-label={`${s.name} volume`} className="mt-1" />
                    ) : (
                      <p className="truncate text-xs text-white/60">{s.description}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-8 grid gap-3 sm:grid-cols-2">
          <Card>
            <p className="mb-3 flex items-center gap-2 font-semibold">
              <Moon className="h-4 w-4" /> Sleep timer {minutesLeft && <span className="text-sm font-normal text-white/60">· fades out in {minutesLeft} min</span>}
            </p>
            <div className="flex flex-wrap gap-2">
              {[null, 15, 30, 60, 90].map((m) => (
                <Chip key={String(m)} active={m === null ? !mixer.timerEndsAt : false} onClick={() => engine.setTimer(m)} disabled={!playing.length && m !== null}>
                  {m ? `${m} min` : "Off"}
                </Chip>
              ))}
            </div>
            <p className="mb-2 mt-5 text-sm font-semibold">Master volume</p>
            <Slider value={[mixer.masterVolume]} min={0} max={1} step={0.01} onValueChange={([v]) => engine.setMasterVolume(v)} aria-label="Master volume" />
          </Card>
          <Card>
            <p className="mb-3 flex items-center gap-2 font-semibold">
              <Heart className="h-4 w-4" /> Saved mixes
            </p>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!currentLayers.length) return;
                saveMix(mixName.trim() || `My mix ${saved.length + 1}`, currentLayers);
                setMixName("");
              }}
            >
              <input className={cn(inputClass, "py-2")} placeholder={currentLayers.length ? "Name this mix" : "Turn on some sounds first"} value={mixName} onChange={(e) => setMixName(e.target.value)} disabled={!currentLayers.length} aria-label="Mix name" />
              <Button type="submit" size="sm" variant="primary" disabled={!currentLayers.length}>
                Save
              </Button>
            </form>
            <ul className="mt-3 space-y-1.5">
              {saved.map((m) => (
                <li key={m.id} className="flex items-center gap-2 rounded-2xl bg-white/6 p-2 pl-3">
                  <button className="flex-1 text-left text-sm font-semibold" onClick={() => loadPreset(m.layers)}>
                    {m.name}
                    <span className="block text-xs font-normal text-white/55">{m.layers.map((l) => SOUNDS.find((s) => s.id === l.soundId)?.name).join(" · ")}</span>
                  </button>
                  <button onClick={() => deleteMix(m.id)} className="rounded-full p-2 text-white/50 hover:bg-white/10" aria-label={`Delete ${m.name}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
              {!saved.length && <li className="text-xs text-white/50">Mixes you save will appear here.</li>}
            </ul>
          </Card>
        </section>
        <p className="mt-6 text-center text-xs text-white/45">Original sounds synthesised with the Web Audio API. Licensed recordings can be added as files and are labelled.</p>
      </Page>
    </>
  );
}
