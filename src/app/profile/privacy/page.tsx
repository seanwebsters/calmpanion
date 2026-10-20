"use client";

import { Check, ChevronLeft, Download, Pencil, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Atmosphere } from "@/components/art/atmosphere";
import { Page } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, inputClass, PageHeader, SectionHeader } from "@/components/ui/misc";
import { Sheet } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useHydrated } from "@/hooks/use-hydrated";
import { useApp } from "@/lib/store/app-store";
import { useUI } from "@/lib/store/ui-store";
import { useAuth } from "@/lib/supabase/auth";
import { getSupabase } from "@/lib/supabase/client";
import { deleteAllRemote } from "@/lib/supabase/sync";
import type { MemoryCategory } from "@/lib/types";
import { cn, relativeDay } from "@/lib/utils";

const CAT_LABEL: Record<MemoryCategory, string> = { favourite_genre: "Favourite stories", session_length: "Session length", bedtime: "Bedtime", sound: "Sounds", routine: "Routine", other: "Other" };

export default function PrivacyPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const { user } = useAuth();
  const s = useApp();
  const showToast = useUI((u) => u.showToast);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [newMemory, setNewMemory] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const p = s.preferences;

  if (!hydrated) return <Page><PageHeader title="Memory & Privacy" /><div className="skeleton h-60 rounded-[28px]" /></Page>;

  const exportAll = () => {
    const { preferences, memories, messages, sessions, favourites, routines, completions, checkIns, journal, generatedStories, soundFavourites } = useApp.getState();
    const data = { exportedAt: new Date().toISOString(), preferences, memories, conversation: messages, sessions, favourites, routines, routineCompletions: completions, checkIns, journal, generatedStories, soundMixes: soundFavourites };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "calm-companion-data.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const deleteEverything = async () => {
    setDeleting(true);
    try {
      const sb = getSupabase();
      if (sb && user) {
        await deleteAllRemote(sb, user.id);
        await sb.auth.signOut();
      }
      useApp.getState().resetAll();
      localStorage.removeItem("calm-companion");
      setConfirmDelete(false);
      router.replace("/onboarding");
    } catch (err) {
      showToast("Couldn't delete everything. Please try again.");
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Atmosphere dim={0.6} />
      <Page>
        <Button size="sm" variant="ghost" className="mt-[max(env(safe-area-inset-top),16px)]" onClick={() => router.back()}>
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        <PageHeader title="Memory & Privacy" subtitle="Everything your companion keeps, in one place. You're in control." className="pt-2" />

        <section>
          <SectionHeader title="Long-term memory" />
          <Card>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <p className="font-semibold">Let {p.companionName} remember preferences</p>
                <p className="mt-1 text-sm text-white/65">Only simple, non-sensitive things like favourite story settings, session length or bedtime habits. Health details and private conversations are never stored as memories.</p>
              </div>
              <Switch checked={p.memoryEnabled} onCheckedChange={(v) => s.updatePreferences({ memoryEnabled: v })} aria-label="Long-term memory" />
            </div>
          </Card>

          {p.memoryEnabled && (
            <div className="mt-3 space-y-2">
              {s.memories.length === 0 ? (
                <EmptyState title="No memories yet" body={`When you tell ${p.companionName} something like "I love rainy stories", it'll appear here.`} />
              ) : (
                s.memories.map((m) => (
                  <div key={m.id} className="glass flex items-center gap-3 rounded-[20px] p-3 pl-4">
                    {editing?.id === m.id ? (
                      <>
                        <input className={cn(inputClass, "py-2")} value={editing.text} maxLength={160} onChange={(e) => setEditing({ id: m.id, text: e.target.value })} aria-label="Edit memory" autoFocus />
                        <Button size="icon" variant="ghost" onClick={() => { if (editing.text.trim()) s.updateMemory(m.id, editing.text.trim()); setEditing(null); }} aria-label="Save">
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setEditing(null)} aria-label="Cancel">
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="min-w-0 flex-1">
                          <p className="text-[15px]">{m.text}</p>
                          <p className="mt-0.5 flex items-center gap-2 text-xs text-white/50">
                            <Badge className="py-0.5">{CAT_LABEL[m.category]}</Badge> {m.source === "companion" ? "Saved by your companion" : "Added by you"} · {relativeDay(m.updatedAt)}
                          </p>
                        </div>
                        <Button size="icon" variant="ghost" onClick={() => setEditing({ id: m.id, text: m.text })} aria-label="Edit memory">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => s.deleteMemory(m.id)} aria-label="Delete memory">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                ))
              )}
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newMemory.trim().length < 2) return;
                  s.addMemory("other", newMemory.trim(), "user");
                  setNewMemory("");
                }}
              >
                <input className={cn(inputClass, "py-2.5")} placeholder="Add something, e.g. 'Prefers stories without music'" value={newMemory} maxLength={160} onChange={(e) => setNewMemory(e.target.value)} aria-label="New memory" />
                <Button type="submit" variant="glass">Add</Button>
              </form>
              {s.memories.length > 0 && (
                <Button size="sm" variant="ghost" onClick={s.clearMemories}>
                  <Trash2 className="h-4 w-4" /> Forget everything
                </Button>
              )}
            </div>
          )}
          {!p.memoryEnabled && s.memories.length > 0 && (
            <p className="mt-2 px-1 text-xs text-white/55">
              Memory is off, so {s.memories.length} saved item{s.memories.length === 1 ? " is" : "s are"} not being used.{" "}
              <button className="underline" onClick={s.clearMemories}>Delete them</button>
            </p>
          )}
        </section>

        <section className="mt-9">
          <SectionHeader title="Your data" />
          <Card className="divide-y divide-white/10 p-0">
            <ToggleRow
              title="Keep conversation history"
              body={`Chat transcripts, separate from memory. ${s.messages.length} message${s.messages.length === 1 ? "" : "s"} stored. Turning this off deletes them.`}
              checked={p.saveConversations}
              onChange={(v) => s.updatePreferences({ saveConversations: v })}
              action={s.messages.length > 0 ? { label: "Clear", onClick: s.clearMessages } : undefined}
            />
            <ToggleRow
              title="Allow AI reflection on journal entries"
              body={`Journal text is only sent to the AI when you ask for reflection questions. ${s.journal.length} entr${s.journal.length === 1 ? "y" : "ies"}, stored privately.`}
              checked={p.journalAiConsent}
              onChange={(v) => s.updatePreferences({ journalAiConsent: v })}
              action={s.journal.length > 0 ? { label: "Delete journal", onClick: s.clearJournal } : undefined}
            />
            <ToggleRow
              title="Keep mood check-ins"
              body={`Used only to show you gentle trends. ${s.checkIns.length} stored. Turning this off deletes them.`}
              checked={p.storeCheckIns}
              onChange={(v) => s.updatePreferences({ storeCheckIns: v })}
              action={s.checkIns.length > 0 ? { label: "Delete", onClick: s.clearCheckIns } : undefined}
            />
          </Card>
          <p className="mt-3 px-1 text-xs text-white/55">
            {user ? "Signed in: your data is also stored in your account, protected by row-level security so only you can access it." : "Not signed in: everything is stored only in this browser."} Messages you send are processed by the AI provider to generate replies.
          </p>
        </section>

        <section className="mt-9 grid gap-3 sm:grid-cols-2">
          <Button variant="glass" onClick={exportAll}>
            <Download className="h-4 w-4" /> Export all my data
          </Button>
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-4 w-4" /> Delete all my data
          </Button>
        </section>
      </Page>

      <Sheet open={confirmDelete} onOpenChange={setConfirmDelete} title="Delete everything?" description={`This permanently removes your preferences, memories, conversations, history, routines, check-ins, journal and stories${user ? " from this device and your account" : " from this device"}. It can't be undone.`}>
        <div className="space-y-2">
          <Button variant="danger" className="w-full" onClick={deleteEverything} disabled={deleting}>
            {deleting ? "Deleting…" : "Yes, delete everything"}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => setConfirmDelete(false)}>
            Keep my data
          </Button>
        </div>
      </Sheet>
    </>
  );
}

function ToggleRow({ title, body, checked, onChange, action }: { title: string; body: string; checked: boolean; onChange: (v: boolean) => void; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="flex items-start gap-4 p-5">
      <div className="flex-1">
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-sm text-white/65">{body}</p>
        {action && (
          <button className="mt-2 text-sm font-semibold text-rose-200 hover:text-rose-100" onClick={action.onClick}>
            {action.label}
          </button>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={title} />
    </div>
  );
}
