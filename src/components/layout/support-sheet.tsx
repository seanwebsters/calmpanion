"use client";

import { ExternalLink, Phone } from "lucide-react";
import Link from "next/link";
import { Sheet } from "@/components/ui/sheet";
import { SUPPORT_RESOURCES } from "@/lib/companion/safety";
import { useUI } from "@/lib/store/ui-store";

export function SupportList() {
  return (
    <ul className="space-y-2">
      {SUPPORT_RESOURCES.map((r) => (
        <li key={r.name} className="rounded-2xl bg-white/8 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-white/55">{r.region}</p>
          <p className="mt-0.5 font-semibold">{r.name}</p>
          <p className="text-sm text-white/75">{r.detail}</p>
          {r.href && (
            <a href={r.href} target={r.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-lilac-200">
              {r.href.startsWith("http") ? <ExternalLink className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
              {r.href.startsWith("http") ? "Open website" : "Contact now"}
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

export function SupportSheet() {
  const open = useUI((s) => s.supportOpen);
  const setOpen = useUI((s) => s.setSupportOpen);
  return (
    <Sheet open={open} onOpenChange={setOpen} title="You don't have to go through this alone" description="Calm Companion is an AI wellbeing app, not a crisis service. These people can help right now.">
      <SupportList />
      <p className="mt-4 text-sm text-white/70">
        If you can, reach out to someone you trust too.{" "}
        <Link href="/support" className="font-semibold text-lilac-200" onClick={() => setOpen(false)}>
          More support options
        </Link>
      </p>
    </Sheet>
  );
}
