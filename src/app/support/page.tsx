import type { Metadata } from "next";
import { SupportList } from "@/components/layout/support-sheet";
import { Page } from "@/components/layout/app-shell";
import { Card, PageHeader } from "@/components/ui/misc";
import { Atmosphere } from "@/components/art/atmosphere";

export const metadata: Metadata = { title: "Support" };

export default function SupportPage() {
  return (
    <>
      <Atmosphere override="evening" dim={0.55} />
      <Page>
        <PageHeader title="Support" subtitle="Calm Companion is here for everyday wellbeing. For anything bigger, please reach out to people who can help." />
        <Card className="mb-5">
          <p className="font-semibold">If you&apos;re in danger or thinking about harming yourself</p>
          <p className="mt-1 text-sm text-white/75">Please contact emergency services or a crisis line now. You deserve support from a real person, and these services are free and confidential.</p>
        </Card>
        <SupportList />
        <Card className="mt-5 space-y-2 text-sm text-white/75">
          <p className="font-semibold text-white">About your companion</p>
          <p>Your companion is an AI. It can&apos;t diagnose, give medical or medication advice, or provide therapy, and it can make mistakes.</p>
          <p>If you&apos;ve been feeling low, anxious or unable to sleep for a while, a GP, doctor or licensed mental health professional can help. Talking to friends and family helps too.</p>
        </Card>
      </Page>
    </>
  );
}
