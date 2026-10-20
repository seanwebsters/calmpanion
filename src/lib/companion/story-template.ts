import { seeded, hashString } from "@/lib/utils";
import type { ArtworkSpec, ContentItem, Landmark, SceneType, ScriptSegment, StoryRequest } from "@/lib/types";

// Template-based story writer used when no AI provider is configured. It produces an
// original, coherent script from the user's choices, and is clearly labelled as such.

export function artworkForSetting(setting: string, atmosphere: string): ArtworkSpec {
  const s = `${setting} ${atmosphere}`.toLowerCase();
  const pick = (scene: SceneType, palette: [string, string, string], landmark: Landmark = "none"): ArtworkSpec => ({
    scene,
    palette,
    landmark,
    moon: /night|moon|star|dark|evening/.test(s),
    stars: /night|star|moon/.test(s),
    sun: /sun|dawn|morning|summer|golden/.test(s) && !/night/.test(s),
  });
  if (/lighthouse|harbou?r|sea|ocean|beach|shore|island|coast/.test(s)) return pick("ocean", ["#0d1440", "#2c3f86", "#f2a98a"], /lighthouse/.test(s) ? "lighthouse" : "boat");
  if (/snow|winter|alpine|frost|ice/.test(s)) return pick("snow", ["#0b1238", "#33417a", "#c7b9f0"], /train/.test(s) ? "train" : "cabin");
  if (/desert|dune|caravan|sand/.test(s)) return pick("desert", ["#0a0f30", "#3b2e6e", "#e8a27f"], "tent");
  if (/forest|wood|cabin|rainforest|grove/.test(s)) return pick("forest", ["#0f1a35", "#26456b", "#7aa3b8"], /cabin/.test(s) ? "cabin" : "none");
  if (/lake|river|pond|canal/.test(s)) return pick("lake", ["#1a2156", "#5266a8", "#a9c7ee"], "boat");
  if (/mountain|valley|peak|hill/.test(s)) return pick("mountains", ["#121a4c", "#5a4a96", "#f0a88f"]);
  if (/garden|meadow|field|orchard/.test(s)) return pick("meadow", ["#0e1235", "#3a3a7e", "#9fb6e8"], "lantern");
  if (/train|railway/.test(s)) return pick("snow", ["#0b1238", "#33417a", "#c7b9f0"], "train");
  return pick("night", ["#0b1130", "#24305f", "#b38fd8"], "lantern");
}

const OPENINGS = [
  "Get comfortable wherever you are, and let your body begin to grow heavy. There's nothing you need to do now except listen, and if your thoughts wander, that's perfectly alright.",
  "Settle in, and let your shoulders soften. Take a slow breath in, and a long breath out. Tonight's story is yours alone, made just for this evening.",
];

const ARRIVALS = [
  "Tonight we're travelling to {setting}. The air here is calm, and {atmosphere} drifts over everything like a soft blanket.",
  "Imagine yourself arriving at {setting}, just as the day is fading. All around, there is {atmosphere}, and the world feels slow and kind.",
];

const CHARACTER = [
  "{name} lives here, and knows every path and corner of this quiet place. Each evening, {name} takes a slow walk before bed, simply to see how everything is settling.",
  "{name} has come here to rest for a while. With nowhere to be and nothing to prove, {name} wanders slowly, noticing the small things.",
];

const SENSORY = [
  "There's a gentle sound all around: {atmosphere}, soft and steady, the kind of sound you stop noticing after a while, the way you stop noticing your own breathing.",
  "The light is low and golden, then silver, then the soft blue of evening. Shapes grow gentle at their edges, and everything seems to lean towards rest.",
  "There's a faint, comforting scent in the air, like woodsmoke and clean linen and something sweet in the distance.",
  "A small path winds ahead, worn smooth by many slow footsteps. {name} follows it without hurrying, listening to the quiet crunch underfoot.",
  "Somewhere nearby, water moves gently. It trickles, and rests, and trickles again, patient and unhurried.",
  "A warm window glows in the distance. Someone inside is making tea, and the kettle sighs quietly as it cools.",
  "The breeze moves through the place like a slow breath. In, and out. In, and out. Nothing needs to be done about it. It simply comes and goes.",
  "{name} pauses to look up. The sky is deepening, and one by one, small lights appear, as if the evening were lighting candles for everyone below.",
];

const THEME_BEATS: Record<string, string[]> = {
  friendship: ["An old friend appears along the way, and they walk together for a while without needing to say much. Their company is easy and warm, like a shared blanket."],
  journey: ["The journey continues, slow and steady. There's no destination to reach tonight. Each step is complete in itself, and the path will still be here tomorrow."],
  nature: ["{name} notices the small lives settling for the night. A bird tucks its head beneath its wing. A rabbit curls into the long grass. Leaves fold themselves softly closed."],
  cosiness: ["Later, {name} sits beside a small fire, wrapped in a thick knitted blanket, with a warm cup held in both hands. The flames flicker gently, and the warmth spreads slowly through tired arms and legs."],
  wonder: ["Something quietly wonderful happens: a drift of tiny glowing lights rises from the grass and floats upwards, slow and silent, like stars returning home."],
  home: ["The way back is familiar and kind. Every step brings {name} a little closer to a soft bed and a quiet room, where the lamp is already glowing."],
  adventure: ["There was an adventure here once, long ago, but tonight the place is peaceful. Its stories are resting, just like you, and they'll wait patiently until morning."],
  animals: ["A sleepy creature pads alongside for a while, a soft-footed fox perhaps, or an old grey cat, before curling up in a sheltered corner to rest."],
};

const WIND_DOWN = [
  "The whole place is settling now. Every sound grows softer. Every movement grows slower. Even the breeze seems to be getting ready for sleep.",
  "{name} finds a comfortable place to rest and lets their eyes close. There is nowhere else to be. Nothing else to do. Just this soft, quiet moment.",
  "Breathe in slowly, and let it out even more slowly. With each breath out, let yourself sink a little deeper, just as {name} is sinking into rest.",
];

const CLOSINGS = [
  "{setting} keeps its gentle watch through the night, and you can rest now, safe and warm. Goodnight.",
  "And so the night goes on, quiet and kind, holding everything gently until morning. Rest now. Goodnight.",
];

function fill(t: string, vars: Record<string, string>) {
  return t.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? "");
}

export function writeTemplateStory(req: StoryRequest): Omit<ContentItem, "id"> & { request: StoryRequest; generatedBy: "demo-template" } {
  const rand = seeded(hashString(JSON.stringify(req)));
  const pickFrom = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
  const name = req.characterName?.trim() || "the traveller";
  const vars = { setting: req.setting.trim(), atmosphere: req.atmosphere.trim().toLowerCase(), name };

  // ~35s per segment including pause, so target count scales with requested length.
  const target = Math.max(6, Math.min(30, Math.round((req.minutes * 60) / 35)));
  const segments: ScriptSegment[] = [];
  segments.push({ text: fill(pickFrom(OPENINGS), vars), pauseSec: 5 });
  segments.push({ text: fill(pickFrom(ARRIVALS), vars), pauseSec: 5 });
  segments.push({ text: fill(pickFrom(CHARACTER), vars), pauseSec: 6 });

  const themeBeats = req.themes
    .map((t) => THEME_BEATS[t.toLowerCase()])
    .filter((x): x is string[] => Boolean(x))
    .map((beats) => pickFrom(beats));
  const middleCount = Math.max(1, target - segments.length - WIND_DOWN.length - 1);
  const sensory = [...SENSORY].sort(() => rand() - 0.5);
  const middle: string[] = [];
  for (let i = 0; i < middleCount; i++) {
    if (themeBeats.length && i % 2 === 1) middle.push(themeBeats.shift()!);
    else middle.push(sensory[i % sensory.length]);
  }
  middle.push(...themeBeats);
  middle.forEach((t, i) => segments.push({ text: fill(t, vars), pauseSec: 6 + Math.min(4, Math.floor(i / 2)) }));
  WIND_DOWN.forEach((t, i) => segments.push({ text: fill(t, vars), pauseSec: 9 + i }));
  segments.push({ text: fill(pickFrom(CLOSINGS), { ...vars, setting: capitalise(vars.setting) }), pauseSec: 12 });

  const title = `${capitalise(req.atmosphere)} at ${titleCase(req.setting.replace(/^(a|an|the)\s+/i, ""))}`;
  return {
    kind: "story",
    title: title.slice(0, 80),
    subtitle: `A personalised story · ${req.themes.join(", ") || "rest"}`,
    description: `An original story written for you: ${req.setting}, with ${req.atmosphere.toLowerCase()}.`,
    narrator: "Nimbus",
    categoryIds: ["sleep-stories", "your-stories"],
    tags: ["personalised", ...req.themes.map((t) => t.toLowerCase())],
    needs: ["sleep", "relax"],
    artwork: artworkForSetting(req.setting, req.atmosphere),
    script: segments,
    ambiencePresetId: ambienceFor(req.setting, req.atmosphere),
    source: "generated",
    request: req,
    generatedBy: "demo-template",
  };
}

export function ambienceFor(setting: string, atmosphere: string) {
  const s = `${setting} ${atmosphere}`.toLowerCase();
  if (/rain|storm|drizzle/.test(s)) return "rainy-window";
  if (/sea|ocean|harbou?r|beach|lighthouse|island|coast/.test(s)) return "harbour-night";
  if (/desert|wind|dune/.test(s)) return "night-wind";
  if (/summer|garden|meadow|cricket/.test(s)) return "summer-night";
  if (/lake|river|stream/.test(s)) return "lakeside";
  return "soft-piano";
}

function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function titleCase(s: string) {
  return s
    .split(" ")
    .map((w) => (["of", "the", "and", "a", "on", "in", "by"].includes(w.toLowerCase()) ? w.toLowerCase() : capitalise(w)))
    .join(" ");
}
