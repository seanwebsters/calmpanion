import Link from "next/link";
import * as React from "react";
import { cn } from "@/lib/utils";

export function Chip({ active, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-all active:scale-95",
        active ? "border-lilac-200/60 bg-lilac-200 text-night-900 shadow-glow" : "border-white/15 bg-white/8 text-white/90 hover:bg-white/15",
        className,
      )}
      {...props}
    />
  );
}

export function Badge({ className, tone = "default", ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: "default" | "ai" | "demo" | "warn" }) {
  const tones = {
    default: "bg-white/12 text-white/85",
    ai: "bg-sky-300/20 text-sky-200 border border-sky-300/30",
    demo: "bg-peach-300/15 text-peach-200 border border-peach-300/25",
    warn: "bg-amber-300/15 text-amber-100 border border-amber-200/30",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider", tones[tone], className)} {...props} />;
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("glass rounded-[28px] p-5", className)} {...props} />;
}

export function SectionHeader({ title, href, action, className }: { title: string; href?: string; action?: string; className?: string }) {
  return (
    <div className={cn("mb-3 flex items-end justify-between px-1", className)}>
      <h2 className="font-display text-xl text-white">{title}</h2>
      {href && (
        <Link href={href} className="text-sm font-semibold text-lilac-200 hover:text-white">
          {action ?? "See all"}
        </Link>
      )}
    </div>
  );
}

export function EmptyState({ title, body, children, art }: { title: string; body: string; children?: React.ReactNode; art?: React.ReactNode }) {
  return (
    <div className="glass flex flex-col items-center rounded-[28px] px-6 py-8 text-center">
      {art}
      <p className="mt-2 font-display text-lg">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-white/70">{body}</p>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-white/90">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-white/55">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-2xl border border-white/15 bg-white/8 px-4 py-3 text-[15px] text-white placeholder:text-white/40 focus:border-lilac-300/60 focus:bg-white/12 focus:outline-none";

export function PageHeader({ title, subtitle, children, className }: { title: string; subtitle?: string; children?: React.ReactNode; className?: string }) {
  return (
    <header className={cn("flex items-start justify-between gap-4 px-1 pb-5 pt-8", className)}>
      <div>
        <h1 className="font-display text-[34px] leading-tight text-white text-glow">{title}</h1>
        {subtitle && <p className="mt-1 text-[15px] text-white/75">{subtitle}</p>}
      </div>
      {children}
    </header>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <span className={cn("inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/25 border-t-white", className)} aria-label="Loading" />;
}
