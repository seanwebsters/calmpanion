import type { ArtworkSpec, SoundId, SoundPreset } from "@/lib/types";

export interface SoundDefinition {
  id: SoundId;
  name: string;
  description: string;
  /** "synth" sounds are generated live with the Web Audio API; "file" sounds need a supplied, licensed asset */
  type: "synth" | "file";
  /** for file sounds: public path the asset is expected at */
  src?: string;
  artwork: ArtworkSpec;
}

export const SOUNDS: SoundDefinition[] = [
  { id: "rain", name: "Soft Rain", description: "Steady rain with scattered droplets", type: "synth", artwork: { scene: "forest", palette: ["#14223f", "#2e5170", "#86a9bd"] } },
  { id: "ocean", name: "Ocean Waves", description: "Slow waves rolling onto the shore", type: "synth", artwork: { scene: "ocean", palette: ["#0f1c4d", "#2f5ea0", "#9fd3ff"] } },
  { id: "forest", name: "Forest Birds", description: "Leafy hush with distant birdsong", type: "synth", artwork: { scene: "forest", palette: ["#1d3a3a", "#3f7a62", "#bde3c0"], sun: true } },
  { id: "wind", name: "Mountain Wind", description: "Breezes moving over high ridges", type: "synth", artwork: { scene: "mountains", palette: ["#1a2456", "#4e6aa8", "#c3d6f5"] } },
  { id: "piano", name: "Soft Piano", description: "Slow, generative piano notes", type: "synth", artwork: { scene: "night", palette: ["#0e1238", "#3a3880", "#c4a8f0"], moon: true, stars: true } },
  { id: "stream", name: "Babbling Stream", description: "Water trickling over stones", type: "synth", artwork: { scene: "meadow", palette: ["#24406b", "#5a96a8", "#cdeedc"] } },
  { id: "crickets", name: "Summer Crickets", description: "A warm night chorus", type: "synth", artwork: { scene: "meadow", palette: ["#0e1235", "#2d356f", "#7f8fd0"], stars: true } },
  { id: "white-noise", name: "White Noise", description: "Even, bright masking noise", type: "synth", artwork: { scene: "clouds", palette: ["#3a4a80", "#8ea4d8", "#e6eeff"] } },
  { id: "brown-noise", name: "Deep Hum", description: "Low, rumbling brown noise", type: "synth", artwork: { scene: "clouds", palette: ["#14143a", "#3a2f6a", "#8a76b8"] } },
  {
    id: "thunder-recording",
    name: "Thunderstorm (recording)",
    description: "Field recording slot. Add a licensed file at /public/audio/thunderstorm.mp3 to enable.",
    type: "file",
    src: "/audio/thunderstorm.mp3",
    artwork: { scene: "night", palette: ["#0b0f26", "#252b55", "#6170a8"] },
  },
];

export const SOUND_PRESETS: SoundPreset[] = [
  {
    id: "rainy-window",
    name: "Rainy Window",
    description: "Rain on glass with a low, cosy hum",
    layers: [{ soundId: "rain", volume: 0.7 }, { soundId: "brown-noise", volume: 0.2 }],
    artwork: { scene: "forest", palette: ["#14223f", "#2e5170", "#86a9bd"], landmark: "cabin" },
  },
  {
    id: "ocean-drift",
    name: "Ocean Drift",
    description: "Waves and a soft sea breeze",
    layers: [{ soundId: "ocean", volume: 0.75 }, { soundId: "wind", volume: 0.2 }],
    artwork: { scene: "ocean", palette: ["#0f1c4d", "#2f5ea0", "#f2b49a"], sun: true },
  },
  {
    id: "harbour-night",
    name: "Harbour Night",
    description: "Lapping water and gentle wind",
    layers: [{ soundId: "ocean", volume: 0.45 }, { soundId: "wind", volume: 0.25 }, { soundId: "piano", volume: 0.15 }],
    artwork: { scene: "ocean", palette: ["#0d1440", "#2c3f86", "#f2a98a"], landmark: "lighthouse", moon: true, stars: true },
  },
  {
    id: "summer-night",
    name: "Summer Night",
    description: "Crickets, a light breeze and a trickling fountain",
    layers: [{ soundId: "crickets", volume: 0.5 }, { soundId: "stream", volume: 0.3 }, { soundId: "wind", volume: 0.15 }],
    artwork: { scene: "meadow", palette: ["#0e1235", "#3a3a7e", "#9fb6e8"], moon: true, stars: true },
  },
  {
    id: "morning-meadow",
    name: "Morning Meadow",
    description: "Birdsong and a nearby stream",
    layers: [{ soundId: "forest", volume: 0.55 }, { soundId: "stream", volume: 0.35 }],
    artwork: { scene: "meadow", palette: ["#3b4a8f", "#e9a6b4", "#ffd2a6"], sun: true, landmark: "tree" },
  },
  {
    id: "lakeside",
    name: "Lakeside",
    description: "Soft water, wind in the reeds",
    layers: [{ soundId: "stream", volume: 0.35 }, { soundId: "wind", volume: 0.25 }, { soundId: "forest", volume: 0.2 }],
    artwork: { scene: "lake", palette: ["#1a2156", "#5266a8", "#a9c7ee"], landmark: "boat" },
  },
  {
    id: "soft-piano",
    name: "Soft Piano",
    description: "Slow piano over a warm hum",
    layers: [{ soundId: "piano", volume: 0.55 }, { soundId: "brown-noise", volume: 0.12 }],
    artwork: { scene: "night", palette: ["#0e1238", "#3a3880", "#c4a8f0"], moon: true, stars: true },
  },
  {
    id: "deep-focus",
    name: "Deep Focus",
    description: "Brown noise with a hint of rain",
    layers: [{ soundId: "brown-noise", volume: 0.55 }, { soundId: "rain", volume: 0.25 }],
    artwork: { scene: "mountains", palette: ["#162a5c", "#4b79b8", "#b9e0f2"] },
  },
  {
    id: "night-wind",
    name: "Night Wind",
    description: "Desert breeze under the stars",
    layers: [{ soundId: "wind", volume: 0.55 }, { soundId: "crickets", volume: 0.15 }],
    artwork: { scene: "desert", palette: ["#0a0f30", "#3b2e6e", "#e8a27f"], stars: true },
  },
];

export function getSound(id: string) {
  return SOUNDS.find((s) => s.id === id);
}

export function getPreset(id: string) {
  return SOUND_PRESETS.find((p) => p.id === id);
}
