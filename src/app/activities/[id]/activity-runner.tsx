"use client";

import { CalmBubbles } from "@/components/activities/calm-bubbles";
import { GentleStretch } from "@/components/activities/gentle-stretch";
import { GratitudeJar } from "@/components/activities/gratitude-jar";
import { Grounding } from "@/components/activities/grounding";
import { MuscleRelease } from "@/components/activities/muscle-release";
import { WorryClouds } from "@/components/activities/worry-clouds";
import { ACTIVITY_ITEMS } from "@/lib/content/catalog";

export function ActivityRunner({ id }: { id: string }) {
  const item = ACTIVITY_ITEMS.find((a) => a.activityId === id)!;
  switch (item.activityId) {
    case "grounding":
      return <Grounding item={item} />;
    case "muscle-release":
      return <MuscleRelease item={item} />;
    case "worry-clouds":
      return <WorryClouds item={item} />;
    case "gratitude-jar":
      return <GratitudeJar item={item} />;
    case "gentle-stretch":
      return <GentleStretch item={item} />;
    case "calm-bubbles":
      return <CalmBubbles item={item} />;
    default:
      return null;
  }
}
