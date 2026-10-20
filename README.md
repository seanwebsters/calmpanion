# Calm Companion

An AI-native reinvention of a meditation and sleep app. Sleep stories, guided meditation, breathing, soundscapes, focus, routines, check-ins and journaling, all reachable through **Nimbus**, a glossy little cloud companion who can talk with you and launch real in-app experiences.

> Calm Companion is a wellbeing app, not a therapist or medical service. The companion always discloses that it is an AI, avoids diagnosis and medical advice, and routes crisis language to real support services.

## Quick start

```bash
npm install
cp .env.example .env.local   # optional: every key is optional
npm run dev                  # http://localhost:3000
```

With **no keys at all** the app is fully usable in honest demo mode:

| Capability | Without keys | With keys |
|---|---|---|
| Companion chat | Rule-based demo companion that calls the **same tool executor** (labelled "Demo") | Claude (`ANTHROPIC_API_KEY`) with structured tool calling |
| Personalised stories | Template story writer, labelled "Generated · demo template" | Claude-written original stories, labelled "AI-written" |
| Journal reflection | Template questions | Claude, only after explicit consent |
| Narration & voice replies | Browser speech synthesis ("Device voice"), or read-along text if unavailable | ElevenLabs natural voice (`ELEVENLABS_API_KEY` + `ELEVENLABS_VOICE_ID`) |
| Voice input | Browser speech recognition where supported, typed fallback otherwise | same |
| Soundscapes | Generated live with the Web Audio API: original and royalty-free | same, plus optional licensed recordings |
| Accounts & sync | Everything stays in this browser (localStorage) | Supabase auth + Postgres with row-level security |

The UI always says which mode is active (Profile → About), and never claims voice, AI or notifications are on when they aren't.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js dev server / production build / serve |
| `npm run lint` | ESLint (Next + React Compiler rules) |
| `npm run typecheck` | Strict TypeScript |
| `npm test` | Vitest: safety, tool executor, demo companion, breathing engine, catalog, rate limiter, `/api/chat` integration |
| `npm run db:seed-sql` | Regenerates `supabase/seed.sql` from the in-app catalogue |

## Supabase (optional)

1. Create a project and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
2. Apply `supabase/migrations/20261020000000_init.sql` (e.g. `supabase db push`) then `supabase/seed.sql`.
3. Enable email (magic link) auth and add your site URL to the redirect allow-list.

The migration creates `profiles`, `companion_preferences`, `companion_memories`, `conversations`, `messages`, `content_items`, `content_categories`, `listening_sessions`, `favourites`, `routines`, `routine_completions`, `check_ins`, `journal_entries`, `generated_stories` and `audio_assets`, with indexes and RLS on every table. User tables only allow `auth.uid() = user_id`; catalogue tables are read-only for clients. An `audio` storage bucket is created for licensed narration/ambience files.

On first sign-in, local data is uploaded; after that the local store mirrors to Supabase (debounced) and "Delete all my data" removes remote rows too.

## Architecture

```
src/
  app/                      Routes (App Router). Pages are client components over a local store.
    api/chat                Companion turn: safety screen → Claude tool loop (or demo engine) → actions
    api/story               Personalised story generation (Claude structured output / template)
    api/reflect             Journal reflection questions; refuses without consent: true
    api/tts                 ElevenLabs proxy (501 when not configured)
    api/capabilities        Which providers are configured (no secrets)
  lib/
    companion/tools.ts      Zod schemas → JSON Schema for 13 tools; ClientAction union
    companion/executor.ts   Runs tools against the real catalogue and user context; returns results + UI actions
    companion/demo-engine   Keyless companion that plans the same tool calls
    companion/safety.ts     Deterministic crisis/distress screening + support resources
    companion/prompt.ts     Cached system prompt (library, rules) + per-turn context
    server/anthropic.ts     Claude calls (Opus 5.5, adaptive thinking, low effort for chat, refusal fallbacks)
    server/rate-limit.ts    Sliding-window limiter (per instance; swap for Redis in production)
    content/                Original demo stories, meditations, breathing, soundscape presets
    audio/engine.ts         Web Audio mixer: 9 synthesised layers, presets, sleep timer, chimes
    audio/narrator.ts       Narration via ElevenLabs or device speech, with honest fallback
    store/app-store.ts      Zustand + persist: preferences, memory, history, routines, journal…
    supabase/               Client, auth hook and sync to the RLS-protected tables
  components/
    companion/mascot.tsx    Nimbus: SVG + Framer Motion (idle, listening, thinking, speaking, sleeping, happy, waving)
    art/landscape.tsx       Deterministic procedural landscapes used for every artwork and background
    player/                 Narration player: progress, speed, sleep timer, ambience, Media Session, completion
```

### How a companion turn works

1. The client sends recent messages plus a **context snapshot** (time, preferences, opted-in memories, recent sessions, routines, favourites).
2. `/api/chat` validates with Zod, rate-limits, and screens the message for crisis language. Crisis → supportive reply + `showSupport` action, no model call.
3. Otherwise Claude runs a manual tool loop. Each `tool_use` goes through `executeTool`, which validates input, checks content ids against the real catalogue, enforces memory rules (opt-in, no sensitive data) and returns a result for the model **and** a `ClientAction`.
4. The client applies actions through real app functions: `player.play()`, the sound mixer, the router (breathing, focus, journal) and the store (routines, memories, generated stories).

Example: *"I can't switch off tonight"* → `recommendContent` (cards shown) → *"Let's do the story"* → `startSleepStory` → the player opens and narrates → on completion you can favourite it or ask Nimbus to remember the preference.

### Memory vs. history

- **Conversation history** is a transcript, kept locally (and in `messages` when signed in) only while "Keep conversation history" is on.
- **Long-term memory** is a separate, opt-in list of short, non-sensitive preferences. Users can view, edit, add, delete or disable it on the Memory & Privacy screen. The executor rejects health, relationship, location and similar content.

### Content and licensing

All stories and meditations are original demo content written for this project and labelled "Original demo". AI-generated stories are labelled separately. No third-party catalogue content is included. Soundscapes are synthesised; a `file` sound slot (`/public/audio/thunderstorm.mp3`) shows as **Unavailable** until a licensed recording is supplied.

### Known limitations

- Reminders/notifications are not implemented; the app records the preference only and says so.
- Device speech may pause when a phone screen locks; ElevenLabs narration plays through an audio element and fares better.
- The rate limiter is in-memory per server instance.
