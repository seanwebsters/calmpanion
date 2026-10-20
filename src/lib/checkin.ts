import type { Mood, TimeOfDay } from "./types";

export const MOODS: { id: Mood; label: string }[] = [
  { id: "stormy", label: "Stormy" },
  { id: "rainy", label: "Rainy" },
  { id: "cloudy", label: "Cloudy" },
  { id: "bright", label: "Brightening" },
  { id: "sunny", label: "Sunny" },
];

/** Tailored, non-diagnostic suggestions after a check-in. */
export function suggestionsFor(mood: Mood, energy: number, tod: TimeOfDay): { message: string; contentIds: string[] } {
  const late = tod === "evening" || tod === "night";
  if (mood === "stormy" || mood === "rainy") {
    return {
      message: "Thanks for being honest about how it is. Something small and steadying might help, and talking to someone you trust can too.",
      contentIds: late ? ["activity-worry-clouds", "breathe-478", "kind-pause"] : ["activity-grounding", "breathe-box", "kind-pause"],
    };
  }
  if (energy <= 2) {
    return {
      message: late ? "Sounds like a tired one. Let's make winding down easy." : "Low on energy? A gentle reset might help more than pushing through.",
      contentIds: late ? ["activity-muscle-release", "body-scan-drift", "sound-rainy-window"] : ["activity-gentle-stretch", "breathe-gentle", "activity-calm-bubbles"],
    };
  }
  if (mood === "sunny" || mood === "bright") {
    return {
      message: "Lovely. Want to savour it for a moment?",
      contentIds: late ? ["activity-gratitude-jar", "moon-garden"] : ["activity-gratitude-jar", "activity-gentle-stretch", "focus-25"],
    };
  }
  return {
    message: "A bit in-between is completely normal. Here are a few gentle options.",
    contentIds: late ? ["activity-muscle-release", "breathe-gentle", "the-night-train-to-alder"] : ["activity-calm-bubbles", "breathe-gentle", "single-point"],
  };
}
