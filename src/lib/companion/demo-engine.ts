import { recommendContent, searchContent } from "@/lib/content/catalog";
import type { ChatMessage, Tone } from "@/lib/types";
import type { CompanionContext, ToolName } from "./tools";

// Demo companion used when no ANTHROPIC_API_KEY is configured. It is rule-based, but it
// drives exactly the same tool executor as the AI path, so every launch is real.

export interface DemoCall {
  name: ToolName;
  input: Record<string, unknown>;
}

export interface DemoPlan {
  calls: DemoCall[];
  reply: string;
  offers?: string[];
}

type Offer = "story" | "breathing" | "meditation" | "sounds" | "focus" | "journal" | "routine";

const has = (t: string, ...words: (string | RegExp)[]) => words.some((w) => (typeof w === "string" ? t.includes(w) : w.test(t)));

function voice(tone: Tone, gentle: string, playful: string, minimal: string) {
  return tone === "playful" ? playful : tone === "minimal" ? minimal : gentle;
}

function detectOffer(t: string): Offer | null {
  if (has(t, "story", "tale")) return "story";
  if (has(t, "breath", "breathing")) return "breathing";
  if (has(t, "meditat", "body scan")) return "meditation";
  if (has(t, "sound", "rain", "ocean", "noise", "waves", "music", "piano")) return "sounds";
  if (has(t, "focus", "timer")) return "focus";
  if (has(t, "journal", "write")) return "journal";
  return null;
}

const AFFIRM = /^(yes|yeah|yep|sure|ok(ay)?|please|go on|sounds good|let'?s (do|try) (it|that)|do it|that one|the first|first one|alright|why not)\b/i;
const SECOND = /\b(second|other one|the other|latter)\b/i;

function storyFor(ctx: CompanionContext) {
  const liked = ctx.memoryEnabled ? ctx.memories.flatMap((m) => m.text.toLowerCase().split(/\W+/)) : [];
  return recommendContent({ need: "sleep", kind: "story", timeOfDay: ctx.timeOfDay, contentLength: ctx.contentLength, likedTags: liked, recentIds: ctx.recentSessions.map((s) => s.contentId) })[0]?.item;
}

function meditationFor(ctx: CompanionContext, need: "stress" | "sleep" | "focus" | "morning" | "relax" | "happiness" | "mindfulness") {
  return recommendContent({ need, kind: "meditation", timeOfDay: ctx.timeOfDay, contentLength: ctx.contentLength, recentIds: ctx.recentSessions.map((s) => s.contentId) })[0]?.item;
}

function launchOffer(offer: Offer, ctx: CompanionContext, text: string): DemoPlan {
  const tone = ctx.tone;
  const evening = ctx.timeOfDay === "evening" || ctx.timeOfDay === "night";
  switch (offer) {
    case "story": {
      const query = text.replace(/.*\b(about|with|set in)\b/i, "").trim();
      const specific = /\b(about|with|set in)\b/i.test(text) ? searchContent({ query, kind: "story" })[0] : undefined;
      const s = specific ?? storyFor(ctx);
      if (!s) return { calls: [], reply: "I couldn't find a story just now. Want to try some sounds instead?" };
      return {
        calls: [{ name: "startSleepStory", input: { contentId: s.id } }],
        reply: voice(tone, `Here's "${s.title}". Get cosy, and let the story do the work.`, `Story time! "${s.title}" is all yours. Blankets at the ready.`, `Playing "${s.title}".`),
      };
    }
    case "breathing": {
      const pattern = evening ? "478" : has(text, "box") ? "box" : "gentle";
      return {
        calls: [{ name: "startBreathing", input: { pattern, minutes: 3 } }],
        reply: voice(tone, "Let's breathe together. Follow the orb, and stop whenever you like.", "Orb's warming up! Breathe along with it, no pressure.", "Breathing Studio is open. Follow the orb."),
      };
    }
    case "meditation": {
      const m = meditationFor(ctx, has(text, "stress", "anxious", "worried") ? "stress" : evening ? "sleep" : ctx.timeOfDay === "morning" ? "morning" : "relax");
      if (!m) return { calls: [], reply: "I couldn't find a session for that. Want to browse Explore together?" };
      return {
        calls: [{ name: "startMeditation", input: { contentId: m.id } }],
        reply: voice(tone, `Starting "${m.title}". I'll be right here.`, `"${m.title}" coming right up. Settle in!`, `Playing "${m.title}".`),
      };
    }
    case "sounds": {
      const map: [RegExp, string][] = [
        [/rain|storm/, "rainy-window"],
        [/ocean|sea|wave|beach/, "ocean-drift"],
        [/piano|music/, "soft-piano"],
        [/forest|bird|morning/, "morning-meadow"],
        [/cricket|summer|garden/, "summer-night"],
        [/wind|desert/, "night-wind"],
        [/noise|focus|work/, "deep-focus"],
        [/lake|river|stream/, "lakeside"],
      ];
      const presetId = map.find(([r]) => r.test(text))?.[1] ?? (evening ? "rainy-window" : "morning-meadow");
      const timer = text.match(/(\d+)\s*(min|minute)/)?.[1];
      return {
        calls: [{ name: "playSoundscape", input: { presetId, timerMinutes: timer ? Number(timer) : evening ? 45 : undefined } }],
        reply: voice(tone, "There we go. You can adjust each layer in the mixer.", "Sounds on! Tweak the mix however you like.", "Soundscape playing."),
      };
    }
    case "focus": {
      const mins = Number(text.match(/(\d+)\s*(min|minute)/)?.[1] ?? 25);
      return {
        calls: [{ name: "startFocusSession", input: { minutes: Math.min(120, Math.max(5, mins)), presetId: "deep-focus" } }],
        reply: voice(tone, `A ${mins}-minute focus block is ready. One small step at a time.`, `${mins} minutes of focus mode, let's go!`, `Focus timer: ${mins} min.`),
      };
    }
    case "journal":
      return {
        calls: [{ name: "openJournal", input: { prompt: "What's on your mind right now?" } }],
        reply: voice(tone, "Your journal is open. Write as much or as little as you like. It stays private.", "Journal's open! Scribble away.", "Journal open."),
      };
    case "routine":
      return planRoutine(ctx);
  }
}

function planRoutine(ctx: CompanionContext): DemoPlan {
  const tod = ctx.timeOfDay === "night" ? "evening" : ctx.timeOfDay;
  const templates = {
    morning: { name: "Five-Minute Morning Reset", ids: ["breathe-gentle", "morning-light"] },
    afternoon: { name: "Afternoon Focus Break", ids: ["sixty-second-reset", "breathe-box", "focus-25"] },
    evening: { name: "Evening Wind-Down", ids: ["dusk-wind-down", "breathe-478", "cabin-in-the-rain"] },
  } as const;
  const t = templates[tod];
  return {
    calls: [{ name: "createRoutine", input: { name: t.name, timeOfDay: tod, contentIds: [...t.ids] } }],
    reply: `I've made you a "${t.name}" routine. You'll find it in My Calm, and you can change, skip or remove it any time.`,
  };
}

export function planDemoTurn(history: Pick<ChatMessage, "role" | "content" | "offers">[], ctx: CompanionContext): DemoPlan {
  const last = history[history.length - 1];
  const text = (last?.content ?? "").toLowerCase().trim();
  const prev = [...history].reverse().find((m) => m.role === "assistant");
  const prevOffers = (prev?.offers ?? []) as Offer[];
  const name = ctx.companionName || "Nimbus";
  const tone = ctx.tone;
  const evening = ctx.timeOfDay === "evening" || ctx.timeOfDay === "night";

  // Follow-ups to a previous offer ("let's do the story", "yes", "the second one")
  if (prevOffers.length) {
    const named = detectOffer(text);
    if (named && prevOffers.includes(named)) return launchOffer(named, ctx, text);
    if (SECOND.test(text) && prevOffers[1]) return launchOffer(prevOffers[1], ctx, text);
    if (AFFIRM.test(text)) return launchOffer(prevOffers[0], ctx, text);
  }

  // Memory: "remember that I like rainy stories"
  const remember = text.match(/\b(remember|note|save)\s+(that\s+)?(i|my)\s+(.+)/i);
  if (remember) {
    const fact = `${remember[3] === "my" ? "Their" : "They"} ${remember[4].replace(/[.!]+$/, "")}`.replace(/\bi\b/g, "they");
    return {
      calls: [{ name: "savePreference", input: { category: /bed|sleep at|\d{1,2}(:\d\d)?\s*(pm|am)/.test(text) ? "bedtime" : /min|short|long/.test(text) ? "session_length" : /story|stories/.test(text) ? "favourite_genre" : /sound|rain|noise/.test(text) ? "sound" : "other", text: fact.slice(0, 150) } }],
      reply: "", // filled in from the tool result
    };
  }

  if (/\b(personali[sz]ed|make|create|write)\b.*\bstory\b/.test(text) || /\bstory\b.*\b(for me|just for me)\b/.test(text)) {
    const setting = text.match(/\b(?:about|in|at|on)\s+(an?\s+|the\s+)?([a-z\s]{3,40}?)(?:\s+with|\s+during|[.,!?]|$)/)?.[2]?.trim() || (evening ? "a lighthouse on a quiet island" : "a sunlit meadow");
    return {
      calls: [{ name: "createPersonalisedStory", input: { setting, atmosphere: has(text, "snow") ? "gently falling snow" : has(text, "rain") ? "soft rain" : "a calm, starry night", minutes: ctx.contentLength === "short" ? 5 : ctx.contentLength === "long" ? 15 : 10, themes: ["cosiness", "nature"] } }],
      reply: voice(tone, "I've written you something new. It's an original, AI-made story. Settle in.", "Fresh off the cloud press: a story just for you!", "Wrote you a new story. Playing now."),
    };
  }

  if (has(text, /\b(what|which).*(done|listened|played|recent)/, "history", "last time")) {
    return { calls: [{ name: "getRecentSessions", input: { limit: 5 } }], reply: "" };
  }
  if (has(text, /\bmy routine/, /routine.*today/)) return { calls: [{ name: "getRoutine", input: {} }], reply: "" };
  if (has(text, "routine", "ritual", "habit")) return planRoutine(ctx);

  if (has(text, "can't sleep", "cant sleep", "can't switch off", "cant switch off", "insomnia", "help me sleep", "awake", "sleep", "tired", "bed")) {
    return {
      calls: [{ name: "recommendContent", input: { need: "sleep" } }],
      reply: voice(
        tone,
        "That's a common feeling at the end of the day. We could try a short breathing exercise, or I could put on a gentle story. Which sounds better?",
        "Brains love to party at bedtime, don't they? We could do some slow breathing, or I could tell you a sleepy story. Your pick!",
        "Breathing exercise or sleep story?",
      ),
      offers: ["breathing", "story"],
    };
  }

  if (has(text, "stress", "anxious", "anxiety", "overwhelm", "worried", "panic", "a lot going on", "tense", "frazzled")) {
    return {
      calls: [{ name: "recommendContent", input: { need: "stress", maxMinutes: 10 } }],
      reply: voice(
        tone,
        "I'm sorry it's feeling heavy. Would a few minutes of slow breathing help, or would you prefer a short guided meditation?",
        "Oof, that sounds like a lot. Want to breathe it out with me, or try a short meditation?",
        "Breathing, or a short meditation?",
      ),
      offers: ["breathing", "meditation"],
    };
  }

  const direct = detectOffer(text);
  if (direct && /\b(play|start|put on|let'?s|do|open|begin|tell me|i want|can we|could you)\b/.test(text)) return launchOffer(direct, ctx, text);
  if (direct === "story") {
    return {
      calls: [{ name: "recommendContent", input: { need: "sleep", kind: "story" } }],
      reply: voice(tone, "Here are a few stories I think you'd like. Shall I start the first one?", "Ooh, story time. Want me to start the top one?", "Some stories. Start the first?"),
      offers: ["story"],
    };
  }
  if (direct) return launchOffer(direct, ctx, text);

  if (has(text, "focus", "concentrat", "study", "work", "distracted", "procrastinat")) {
    return {
      calls: [],
      reply: voice(tone, "Let's make it easier to begin. Want a 25-minute focus timer with soft sound, or a one-minute reset first?", "Focus mode! 25-minute timer with cosy noise, or a quick reset first?", "25-min focus timer, or a quick reset?"),
      offers: ["focus", "meditation"],
    };
  }
  if (has(text, "relax", "unwind", "calm down", "chill")) {
    return {
      calls: [{ name: "recommendContent", input: { need: "relax" } }],
      reply: voice(tone, "Let's slow things down. I could play some soothing sounds, or start a gentle relaxation. Which would you like?", "Relaxation incoming. Cosy sounds or a guided unwind?", "Sounds or guided relaxation?"),
      offers: ["sounds", "meditation"],
    };
  }
  if (has(text, "sad", "down", "lonely", "low", "upset")) {
    return {
      calls: [],
      reply: `I'm sorry you're feeling low, and I'm glad you said so. I'm an AI, but I'm here to keep you company for a moment. Would it help to write it down in your journal, or try a short, kind meditation? If it's been weighing on you for a while, talking to someone you trust can really help too.`,
      offers: ["journal", "meditation"],
    };
  }
  if (has(text, "happy", "grateful", "good day", "great")) {
    return {
      calls: [],
      reply: voice(tone, "That's lovely to hear. Would you like to capture it in your journal, or try a short gratitude practice?", "Yay! Want to bottle that feeling in your journal, or do a little gratitude practice?", "Journal it, or a gratitude practice?"),
      offers: ["journal", "meditation"],
    };
  }
  if (has(text, "are you human", "are you real", "are you an ai", "who are you", "what are you")) {
    return { calls: [], reply: `I'm ${name}, an AI companion in this app. I'm not a person or a therapist, but I can help you find stories, meditations, breathing and sounds, and keep you company while you use them.` };
  }
  if (has(text, /^(hi|hey|hello|good (morning|afternoon|evening))/)) {
    const greet = ctx.timeOfDay === "morning" ? "Good morning" : ctx.timeOfDay === "afternoon" ? "Good afternoon" : "Good evening";
    return {
      calls: [],
      reply: voice(tone, `${greet}${ctx.userName ? `, ${ctx.userName}` : ""}. How are you feeling right now?`, `${greet}${ctx.userName ? `, ${ctx.userName}` : ""}! *floats happily* How's your day going?`, `${greet}. How are you?`),
    };
  }

  return {
    calls: [],
    reply: voice(
      tone,
      evening
        ? "I'm here. Would you like to wind down with a story, or just breathe for a minute together?"
        : "I'm here. Would you like to try a short breathing exercise, or put on some calming sounds?",
      evening ? "I'm all ears (well, all cloud). Story, or some slow breathing?" : "I'm all ears (well, all cloud). Breathing break, or some cosy sounds?",
      evening ? "Story or breathing?" : "Breathing or sounds?",
    ),
    offers: evening ? ["story", "breathing"] : ["breathing", "sounds"],
  };
}

/** Writes the reply for data-only tools once results are known. */
export function demoReplyFromResults(plan: DemoPlan, results: { name: string; ok: boolean; result: Record<string, unknown>; summary: string }[]): string {
  if (plan.reply) {
    const failed = results.find((r) => !r.ok);
    return failed ? `Hmm, that didn't work: ${failed.summary.toLowerCase()}. Shall we try something else?` : plan.reply;
  }
  const r = results[0];
  if (!r) return "I'm here.";
  if (r.name === "savePreference") {
    if (r.ok) return `Got it. I'll remember that. You can see or delete it any time in Memory & Privacy.`;
    return r.summary === "Memory is off"
      ? "Long-term memory is switched off, so I won't keep that. You can turn it on in Memory & Privacy if you'd like."
      : "That sounds personal, so I haven't stored it. I only keep simple preferences, like favourite sounds or story settings.";
  }
  if (r.name === "getRecentSessions") {
    const sessions = (r.result.sessions as { title: string; when: string }[]) ?? [];
    if (!sessions.length) return "You haven't played anything yet. Shall we find something together?";
    return `Recently you've enjoyed ${sessions.slice(0, 3).map((s) => `"${s.title}"`).join(", ")}. Want to revisit one, or try something new?`;
  }
  if (r.name === "getRoutine") {
    const routines = (r.result.routines as { name: string; doneToday: boolean }[]) ?? [];
    if (!routines.length) return "You don't have a routine yet. Would you like me to make one for this time of day?";
    return routines.map((x) => `"${x.name}"${x.doneToday ? " is done for today, lovely" : " is ready whenever you are"}`).join("; ") + ".";
  }
  return "Here's what I found.";
}
