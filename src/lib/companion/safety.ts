// Safety screening that runs before any AI call. Deterministic on purpose: it must work
// identically with or without an AI provider, and must never depend on a model's judgement.

export type SafetyLevel = "none" | "distress" | "crisis";

const CRISIS_PATTERNS: RegExp[] = [
  /\b(kill|hurt|harm|cut)\s+(myself|me)\b/i,
  /\bsuicid(e|al)\b/i,
  /\bend\s+(it\s+all|my\s+life|things)\b/i,
  /\b(want|wanna|going)\s+to\s+die\b/i,
  /\bwish\s+i\s+(was|were)\s+dead\b/i,
  /\bdon'?t\s+want\s+to\s+(be\s+alive|live|wake\s+up)\b/i,
  /\bno\s+reason\s+to\s+live\b/i,
  /\bself[-\s]?harm/i,
  /\boverdos(e|ing)\b/i,
  /\bbetter\s+off\s+without\s+me\b/i,
  /\b(someone|he|she|they)\s+(is|are|keeps?)\s+(hurting|hitting|abusing)\s+me\b/i,
  /\bi('?m| am)\s+not\s+safe\b/i,
];

const DISTRESS_PATTERNS: RegExp[] = [
  /\bpanic\s+attack/i,
  /\bcan'?t\s+(breathe|cope|go\s+on)\b/i,
  /\bhopeless\b/i,
  /\bworthless\b/i,
  /\bfalling\s+apart\b/i,
  /\bbreaking\s+down\b/i,
  /\bso\s+(alone|lonely)\b/i,
];

export function assessSafety(text: string): SafetyLevel {
  if (CRISIS_PATTERNS.some((p) => p.test(text))) return "crisis";
  if (DISTRESS_PATTERNS.some((p) => p.test(text))) return "distress";
  return "none";
}

export interface SupportResource {
  region: string;
  name: string;
  detail: string;
  href?: string;
}

export const SUPPORT_RESOURCES: SupportResource[] = [
  { region: "Anywhere", name: "Emergency services", detail: "If you're in immediate danger, call your local emergency number (e.g. 911, 999, 112)." },
  { region: "United States", name: "988 Suicide & Crisis Lifeline", detail: "Call or text 988, available 24/7", href: "tel:988" },
  { region: "UK & Ireland", name: "Samaritans", detail: "Call 116 123, free, 24/7", href: "tel:116123" },
  { region: "UK", name: "Shout", detail: "Text SHOUT to 85258", href: "sms:85258" },
  { region: "Other countries", name: "Find A Helpline", detail: "Free, confidential helplines worldwide", href: "https://findahelpline.com" },
];

export function crisisReply(companionName: string): string {
  return [
    "I'm really glad you told me. What you're feeling matters, and you deserve support from a real person right now.",
    `I'm ${companionName}, an AI companion, so I can't give you the help you need in a moment like this, but people at a crisis line can, any time of day or night.`,
    "If you might act on these feelings or you're in danger, please contact emergency services now. I've opened some support options for you. If you can, reach out to someone you trust too.",
  ].join(" ");
}

export const DISTRESS_GUIDANCE =
  "The user may be in acute distress. Respond with warmth and very short sentences. Offer one grounding option (e.g. a slow breathing exercise) and gently mention that talking to someone they trust or a professional can help. Do not diagnose.";
