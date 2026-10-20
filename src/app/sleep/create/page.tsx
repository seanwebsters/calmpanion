"use client";

import { ChevronLeft, Play, RefreshCw, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Atmosphere } from "@/components/art/atmosphere";
import { Landscape } from "@/components/art/landscape";
import { Mascot } from "@/components/companion/mascot";
import { Page } from "@/components/layout/app-shell";
import { usePlayer } from "@/components/player/player-provider";
import { SourceBadge } from "@/components/player/player-ui";
import { Button } from "@/components/ui/button";
import { Chip, Field, inputClass, PageHeader } from "@/components/ui/misc";
import { useCapabilities } from "@/hooks/use-capabilities";
import { useClientValue } from "@/hooks/use-client-value";
import { deviceSpeechAvailable } from "@/lib/audio/narrator";
import { contentMinutes } from "@/lib/content/catalog";
import { useApp } from "@/lib/store/app-store";
import type { GeneratedStory } from "@/lib/types";

const SETTINGS = ["a lighthouse on a quiet island", "a snowy alpine cabin", "a desert caravan camp", "a misty forest grove", "a moonlit garden", "a slow canal boat", "a mountain lake at dusk"];
const ATMOSPHERES = ["soft rain", "gently falling snow", "a warm summer night", "a misty dawn", "a starry, still night", "a cosy autumn evening"];
const THEMES = ["cosiness", "nature", "journey", "friendship", "wonder", "animals"];

export default function CreateStoryPage() {
  const router = useRouter();
  const caps = useCapabilities();
  const speechOk = useClientValue(deviceSpeechAvailable, false);
  const player = usePlayer();
  const addGeneratedStory = useApp((s) => s.addGeneratedStory);
  const contentLength = useApp((s) => s.preferences.contentLength);
  const [setting, setSetting] = useState(SETTINGS[0]);
  const [custom, setCustom] = useState("");
  const [atmosphere, setAtmosphere] = useState(ATMOSPHERES[0]);
  const [minutes, setMinutes] = useState(contentLength === "short" ? 5 : contentLength === "long" ? 15 : 10);
  const [themes, setThemes] = useState<string[]>(["cosiness"]);
  const [characterName, setCharacterName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [story, setStory] = useState<GeneratedStory | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setting: custom.trim() || setting, atmosphere, minutes, themes, characterName: characterName.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't write the story.");
      const s = data.story as GeneratedStory;
      addGeneratedStory(s);
      setStory(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't write the story.");
    } finally {
      setLoading(false);
    }
  };

  const narration = caps?.tts === "elevenlabs" ? "Narrated with a natural voice." : speechOk ? "Narrated with your device's built-in voice." : "No voice available in this browser: it will play as read-along text.";

  return (
    <>
      <Atmosphere override="night" dim={0.45} />
      <Page>
        <Button size="icon" variant="glass" className="mt-[max(env(safe-area-inset-top),16px)]" onClick={() => router.back()} aria-label="Back">
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <PageHeader title="Your story" subtitle="An original sleep story, written for you in a few seconds." className="pt-4" />

        {loading ? (
          <div className="glass flex flex-col items-center rounded-[28px] px-6 py-12 text-center">
            <Mascot state="thinking" size={140} />
            <p className="mt-3 font-display text-xl">Writing something gentle…</p>
            <p className="mt-1 text-sm text-white/65">Gathering clouds, stars and soft sounds.</p>
          </div>
        ) : story ? (
          <div className="glass overflow-hidden rounded-[28px]">
            <div className="relative aspect-[16/9]">
              <Landscape spec={story.artwork} seed={story.id} animated detail="high" />
              <div className="absolute inset-0 bg-gradient-to-t from-night-950/90 to-transparent" />
              <div className="absolute bottom-4 left-5 right-5">
                <SourceBadge source="generated" generatedBy={story.generatedBy} />
                <h2 className="mt-2 font-display text-3xl">{story.title}</h2>
              </div>
            </div>
            <div className="p-5">
              <p className="text-white/80">{story.description}</p>
              <p className="mt-3 font-display italic leading-relaxed text-white/70">&ldquo;{story.script[1]?.text ?? story.script[0]?.text}&rdquo;</p>
              <p className="mt-3 text-xs text-white/55">
                ≈ {contentMinutes(story)} min · {narration} {story.generatedBy === "demo-template" ? "Written by the demo story engine (no AI provider configured)." : "Written by AI. Saved to your stories."}
              </p>
              <div className="mt-5 flex gap-2">
                <Button variant="primary" className="flex-1" onClick={() => player.play(story)}>
                  <Play className="h-4 w-4" /> Play now
                </Button>
                <Button variant="glass" onClick={() => setStory(null)}>
                  <RefreshCw className="h-4 w-4" /> New
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <section>
              <p className="mb-2 text-sm font-semibold">Where should it take place?</p>
              <div className="flex flex-wrap gap-2">
                {SETTINGS.map((s) => (
                  <Chip key={s} active={!custom && setting === s} onClick={() => { setSetting(s); setCustom(""); }}>
                    {s.replace(/^an? /, "")}
                  </Chip>
                ))}
              </div>
              <input className={`${inputClass} mt-3`} placeholder="Or describe your own place…" value={custom} maxLength={80} onChange={(e) => setCustom(e.target.value)} aria-label="Custom setting" />
            </section>
            <section>
              <p className="mb-2 text-sm font-semibold">Atmosphere</p>
              <div className="flex flex-wrap gap-2">
                {ATMOSPHERES.map((a) => (
                  <Chip key={a} active={atmosphere === a} onClick={() => setAtmosphere(a)}>
                    {a}
                  </Chip>
                ))}
              </div>
            </section>
            <section>
              <p className="mb-2 text-sm font-semibold">Themes (up to 3)</p>
              <div className="flex flex-wrap gap-2">
                {THEMES.map((t) => (
                  <Chip key={t} active={themes.includes(t)} onClick={() => setThemes((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t].slice(-3)))}>
                    {t}
                  </Chip>
                ))}
              </div>
            </section>
            <section>
              <p className="mb-2 text-sm font-semibold">Length</p>
              <div className="flex gap-2">
                {[5, 10, 15].map((m) => (
                  <Chip key={m} active={minutes === m} onClick={() => setMinutes(m)}>
                    ~{m} min
                  </Chip>
                ))}
              </div>
            </section>
            <Field label="A character's name" hint="Optional. Leave blank and the story will be about a quiet traveller.">
              <input className={inputClass} value={characterName} maxLength={30} onChange={(e) => setCharacterName(e.target.value)} />
            </Field>
            {error && <p className="rounded-2xl bg-amber-200/10 p-3 text-sm text-amber-100" role="alert">{error}</p>}
            <Button variant="primary" size="lg" className="w-full" onClick={generate}>
              <Sparkles className="h-5 w-5" /> Write my story
            </Button>
            <p className="text-center text-xs text-white/50">
              {caps?.ai === "anthropic" ? "Written by AI and labelled as AI-generated." : "Demo mode: written by a simple template engine, labelled as AI-style content."} {narration}
            </p>
          </div>
        )}
      </Page>
    </>
  );
}
