"use client";

import { ChevronLeft, Download, Lock, PenLine, Shuffle, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Atmosphere } from "@/components/art/atmosphere";
import { Mascot } from "@/components/companion/mascot";
import { Page } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, PageHeader, SectionHeader, Spinner } from "@/components/ui/misc";
import { Sheet } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useHydrated } from "@/hooks/use-hydrated";
import { useApp } from "@/lib/store/app-store";
import type { JournalEntry } from "@/lib/types";
import { cn, relativeDay } from "@/lib/utils";

const PROMPTS = [
  "What's on your mind right now?",
  "What's one small thing that went well today?",
  "What are you looking forward to?",
  "What would you like to let go of tonight?",
  "Who made today a little better, and how?",
  "What does your body need right now?",
  "If today had a weather, what would it be?",
  "What's something you're learning about yourself lately?",
];

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function JournalPage() {
  const hydrated = useHydrated();
  const journal = useApp((s) => s.journal);
  const consent = useApp((s) => s.preferences.journalAiConsent);
  const updatePreferences = useApp((s) => s.updatePreferences);
  const saveJournal = useApp((s) => s.saveJournal);
  const deleteJournal = useApp((s) => s.deleteJournal);
  // A prompt handed over by the companion opens the editor straight away.
  const [editing, setEditing] = useState<{ id?: string; prompt?: string; body: string; reflection?: string[] } | null>(() => {
    const launch = useApp.getState().pendingLaunch;
    return launch?.type === "journal" ? { prompt: launch.prompt ?? PROMPTS[0], body: "" } : null;
  });
  const [promptIdx, setPromptIdx] = useState(0);
  const [consentOpen, setConsentOpen] = useState(false);
  const [reflecting, setReflecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    const launch = useApp.getState().pendingLaunch;
    if (launch?.type === "journal") useApp.getState().setPendingLaunch(null);
  }, []);

  const save = () => {
    if (!editing || !editing.body.trim()) return null;
    const entry = saveJournal({ id: editing.id, prompt: editing.prompt, body: editing.body, reflection: editing.reflection });
    setEditing((e) => (e ? { ...e, id: entry.id } : e));
    setSavedAt(new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }));
    return entry;
  };

  const reflect = async (consented: boolean = consent) => {
    if (!editing || editing.body.trim().length < 10) {
      setError("Write a few sentences first.");
      return;
    }
    if (!consented) {
      setConsentOpen(true);
      return;
    }
    setReflecting(true);
    setError(null);
    try {
      const res = await fetch("/api/reflect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entry: editing.body, consent: true }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const reflection = data.questions as string[];
      setEditing((e) => (e ? { ...e, reflection } : e));
      saveJournal({ id: editing.id, prompt: editing.prompt, body: editing.body, reflection });
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Reflection isn't available right now.");
    } finally {
      setReflecting(false);
    }
  };

  const exportAll = (format: "md" | "json") => {
    if (format === "json") download("calm-companion-journal.json", JSON.stringify(journal, null, 2), "application/json");
    else
      download(
        "calm-companion-journal.md",
        journal.map((j: JournalEntry) => `## ${new Date(j.createdAt).toLocaleString()}\n\n${j.prompt ? `_${j.prompt}_\n\n` : ""}${j.body}\n${j.reflection?.length ? `\nReflection questions:\n${j.reflection.map((q) => `- ${q}`).join("\n")}\n` : ""}`).join("\n---\n\n"),
        "text/markdown",
      );
  };

  return (
    <>
      <Atmosphere dim={0.55} />
      <Page>
        {editing ? (
          <div className="pt-[max(env(safe-area-inset-top),16px)]">
            <div className="flex items-center justify-between pt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  save();
                  setEditing(null);
                  setError(null);
                }}
              >
                <ChevronLeft className="h-4 w-4" /> Save &amp; close
              </Button>
              <span className="flex items-center gap-1 text-xs text-white/55">
                <Lock className="h-3 w-3" /> Private{savedAt ? ` · saved ${savedAt}` : ""}
              </span>
            </div>
            <Card className="mt-4">
              {editing.prompt && <p className="font-display text-xl text-lilac-200">{editing.prompt}</p>}
              <textarea
                autoFocus
                className="mt-3 min-h-[40vh] w-full resize-none bg-transparent text-[17px] leading-relaxed text-white placeholder:text-white/35 focus:outline-none"
                placeholder="Start writing… no one else will see this."
                value={editing.body}
                maxLength={20000}
                onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                aria-label="Journal entry"
              />
              <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
                <Button variant="primary" size="sm" onClick={save} disabled={!editing.body.trim()}>
                  Save
                </Button>
                <Button variant="glass" size="sm" onClick={() => void reflect()} disabled={reflecting}>
                  {reflecting ? <Spinner className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />} Reflection questions
                </Button>
              </div>
              {error && <p className="mt-3 text-sm text-amber-100">{error}</p>}
            </Card>
            {editing.reflection && (
              <Card className="mt-4">
                <div className="flex items-center gap-3">
                  <Mascot size={44} still />
                  <p className="font-semibold">Some questions to sit with, if you like</p>
                </div>
                <ul className="mt-3 space-y-2">
                  {editing.reflection.map((q) => (
                    <li key={q} className="rounded-2xl bg-white/8 p-3 font-display text-[16px]">
                      {q}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        ) : (
          <>
            <PageHeader title="Journal" subtitle="A private space to write. Just for you." />
            <Card className="relative overflow-hidden">
              <p className="text-xs font-bold uppercase tracking-wider text-white/55">Today&apos;s prompt</p>
              <p className="mt-2 font-display text-2xl leading-snug">{PROMPTS[promptIdx]}</p>
              <div className="mt-4 flex gap-2">
                <Button variant="primary" onClick={() => setEditing({ prompt: PROMPTS[promptIdx], body: "" })}>
                  <PenLine className="h-4 w-4" /> Write
                </Button>
                <Button variant="ghost" onClick={() => setPromptIdx((i) => (i + 1) % PROMPTS.length)} aria-label="Another prompt">
                  <Shuffle className="h-4 w-4" /> Another
                </Button>
                <Button variant="ghost" onClick={() => setEditing({ body: "" })}>
                  Free write
                </Button>
              </div>
            </Card>

            <section className="mt-9">
              <SectionHeader title="Previous entries" />
              {!hydrated ? (
                <div className="skeleton h-32 rounded-[28px]" />
              ) : journal.length === 0 ? (
                <EmptyState title="Your journal is empty" body="Entries are stored privately. They're only ever sent to the AI if you ask for reflection questions and agree to it." />
              ) : (
                <ul className="space-y-2">
                  {journal.map((j) => (
                    <li key={j.id} className="glass flex items-start gap-3 rounded-[22px] p-4">
                      <button className="min-w-0 flex-1 text-left" onClick={() => setEditing({ id: j.id, prompt: j.prompt, body: j.body, reflection: j.reflection })}>
                        <p className="text-xs font-semibold text-white/55">{relativeDay(j.createdAt)}</p>
                        {j.prompt && <p className="mt-0.5 text-sm italic text-white/65">{j.prompt}</p>}
                        <p className="mt-1 line-clamp-2 text-[15px]">{j.body}</p>
                      </button>
                      <button onClick={() => deleteJournal(j.id)} className="rounded-full p-2 text-white/50 hover:bg-white/10" aria-label="Delete entry">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {journal.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="glass" onClick={() => exportAll("md")}>
                    <Download className="h-4 w-4" /> Export Markdown
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => exportAll("json")}>
                    Export JSON
                  </Button>
                </div>
              )}
            </section>

            <Card className="mt-8 flex items-start gap-3">
              <Lock className="mt-0.5 h-5 w-5 shrink-0 text-lilac-200" />
              <div className="flex-1">
                <p className="font-semibold">AI reflection</p>
                <p className="text-sm text-white/65">Allow journal text to be sent to the AI provider when you ask for reflection questions. Off by default.</p>
              </div>
              <Switch checked={consent} onCheckedChange={(v) => updatePreferences({ journalAiConsent: v })} aria-label="Allow AI reflection" />
            </Card>
          </>
        )}
      </Page>

      <Sheet open={consentOpen} onOpenChange={setConsentOpen} title="Share this entry with the AI?" description="To suggest reflection questions, this entry's text is sent to the AI provider. It isn't stored as a memory, and you can turn this off any time.">
        <div className="space-y-3">
          <Button
            variant="primary"
            className="w-full"
            onClick={() => {
              updatePreferences({ journalAiConsent: true });
              setConsentOpen(false);
              void reflect(true);
            }}
          >
            Allow and reflect
          </Button>
          <Button variant="ghost" className={cn("w-full")} onClick={() => setConsentOpen(false)}>
            Not now
          </Button>
        </div>
      </Sheet>
    </>
  );
}
