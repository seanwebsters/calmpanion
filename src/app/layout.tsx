import type { Metadata, Viewport } from "next";
import { Fraunces, Nunito } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", axes: ["SOFT", "opsz"], display: "swap" });
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Calm Companion", template: "%s · Calm Companion" },
  description: "Sleep stories, meditation, breathing and soundscapes with a gentle AI companion.",
  applicationName: "Calm Companion",
  appleWebApp: { capable: true, title: "Calm Companion", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0a0f33",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${nunito.variable}`}>
      <body className="antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
