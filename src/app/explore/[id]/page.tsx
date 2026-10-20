import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CATALOG, getContent } from "@/lib/content/catalog";
import { ContentDetail } from "./content-detail";

export function generateStaticParams() {
  return CATALOG.map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const item = getContent(id);
  return { title: item?.title ?? "Not found", description: item?.description };
}

export default async function ContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getContent(id)) notFound();
  return <ContentDetail id={id} />;
}
