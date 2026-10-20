import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ACTIVITY_ITEMS } from "@/lib/content/catalog";
import { ActivityRunner } from "./activity-runner";

export function generateStaticParams() {
  return ACTIVITY_ITEMS.map((a) => ({ id: a.activityId! }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: ACTIVITY_ITEMS.find((a) => a.activityId === id)?.title ?? "Activity" };
}

export default async function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ACTIVITY_ITEMS.some((a) => a.activityId === id)) notFound();
  return <ActivityRunner id={id} />;
}
