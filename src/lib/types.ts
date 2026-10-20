// Core domain types shared by the client, the API routes and the companion tools.

export type ContentKind = "story" | "meditation" | "breathing" | "soundscape" | "focus";

export type SceneType =
  | "mountains"
  | "lake"
  | "night"
  | "forest"
  | "sunrise"
  | "ocean"
  | "clouds"
  | "desert"
  | "meadow"
  | "snow";

export type Landmark = "lighthouse" | "cabin" | "lantern" | "boat" | "train" | "tent" | "tree" | "none";

export interface ArtworkSpec {
  scene: SceneType;
  /** top, middle, horizon colours */
  palette: [string, string, string];
  landmark?: Landmark;
  moon?: boolean;
  stars?: boolean;
  sun?: boolean;
}

export interface ScriptSegment {
  text: string;
  /** silence after the segment, in seconds (at 1x speed) */
  pauseSec: number;
}

/**
 * Where a piece of content comes from. The UI always labels this so original demo
 * content, AI-generated content and licensed catalogue content are never confused.
 */
export type ContentSource = "original-demo" | "generated" | "licensed";

export type Need = "sleep" | "stress" | "relax" | "focus" | "habits" | "happiness" | "mindfulness" | "morning";

export interface ContentItem {
  id: string;
  kind: ContentKind;
  title: string;
  subtitle: string;
  description: string;
  narrator: string;
  categoryIds: string[];
  tags: string[];
  needs: Need[];
  artwork: ArtworkSpec;
  script: ScriptSegment[];
  /** soundscape preset played softly underneath narration */
  ambiencePresetId?: string;
  source: ContentSource;
  featured?: boolean;
  /** for breathing items */
  breathingPatternId?: BreathingPatternId;
  /** explicit duration for non-narrated items (focus, breathing, soundscape) */
  fixedMinutes?: number;
  createdAt?: string;
}

export interface ContentCategory {
  id: string;
  name: string;
  kind: ContentKind | "any";
  description: string;
  artwork: ArtworkSpec;
}

export type BreathingPatternId = "box" | "478" | "gentle" | "custom";

export interface BreathingPattern {
  id: BreathingPatternId;
  name: string;
  description: string;
  inhale: number;
  hold: number;
  exhale: number;
  holdAfter: number;
}

export type SoundId =
  | "rain"
  | "ocean"
  | "forest"
  | "wind"
  | "piano"
  | "white-noise"
  | "brown-noise"
  | "crickets"
  | "stream"
  | "thunder-recording";

export interface SoundLayerSetting {
  soundId: SoundId;
  volume: number; // 0..1
}

export interface SoundPreset {
  id: string;
  name: string;
  description: string;
  layers: SoundLayerSetting[];
  artwork: ArtworkSpec;
}

export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

export type Goal = "sleep" | "stress" | "relax" | "focus" | "habits" | "happiness" | "mindfulness";

export type Tone = "gentle" | "playful" | "minimal";
export type VoiceStyle = "warm" | "bright" | "deep";
export type ContentLength = "short" | "medium" | "long";

export interface CompanionPreferences {
  companionName: string;
  userName: string;
  goals: Goal[];
  voice: VoiceStyle;
  tone: Tone;
  bedtime: string; // HH:MM
  contentLength: ContentLength;
  /** what the user asked for; delivery is not implemented, see UI */
  notificationsWanted: boolean;
  /** explicit opt-in to long-term memory */
  memoryEnabled: boolean;
  /** keep chat transcripts on this device / account */
  saveConversations: boolean;
  /** explicit consent before any journal text is sent to the AI */
  journalAiConsent: boolean;
  /** keep mood check-ins */
  storeCheckIns: boolean;
  /** play spoken replies in voice mode */
  voiceReplies: boolean;
  hapticsEnabled: boolean;
  breathingSoundCues: boolean;
}

export type MemoryCategory = "favourite_genre" | "session_length" | "bedtime" | "sound" | "routine" | "other";

export interface CompanionMemory {
  id: string;
  category: MemoryCategory;
  text: string;
  createdAt: string;
  updatedAt: string;
  source: "user" | "companion";
}

export interface ListeningSession {
  id: string;
  contentId: string;
  title: string;
  kind: ContentKind;
  startedAt: string;
  completedAt?: string;
  /** 0..1 */
  progress: number;
  minutes: number;
}

export interface RoutineStep {
  contentId: string;
  title: string;
  kind: ContentKind;
  minutes: number;
}

export interface Routine {
  id: string;
  name: string;
  description: string;
  timeOfDay: TimeOfDay;
  days: number[]; // 0=Sun..6=Sat
  steps: RoutineStep[];
  createdAt: string;
  createdBy: "user" | "companion" | "template";
  active: boolean;
}

export interface RoutineCompletion {
  id: string;
  routineId: string;
  date: string; // YYYY-MM-DD
  status: "done" | "skipped";
}

export type Mood = "stormy" | "rainy" | "cloudy" | "bright" | "sunny";

export interface CheckIn {
  id: string;
  mood: Mood;
  energy: number; // 1..5
  note?: string;
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  prompt?: string;
  body: string;
  reflection?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedStory extends ContentItem {
  source: "generated";
  generatedBy: "anthropic" | "demo-template";
  request: StoryRequest;
}

export interface StoryRequest {
  setting: string;
  atmosphere: string;
  minutes: number;
  themes: string[];
  characterName?: string;
}

export type ChatRole = "user" | "assistant";

export interface ToolEvent {
  name: string;
  summary: string;
  ok: boolean;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  toolEvents?: ToolEvent[];
  /** content ids to render as cards under the message */
  contentIds?: string[];
  /** options the companion offered (used by the demo engine for follow-ups) */
  offers?: string[];
  support?: boolean;
  provider?: "anthropic" | "demo" | "safety";
}
