"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  side = "bottom",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  side?: "bottom" | "center";
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-night-950/60 backdrop-blur-sm data-[state=open]:animate-in" />
        <Dialog.Content
          className={cn(
            "glass-strong fixed z-50 max-h-[88dvh] overflow-y-auto p-6 text-white focus:outline-none",
            side === "bottom"
              ? "inset-x-0 bottom-0 rounded-t-[32px] pb-10 sm:inset-x-auto sm:left-1/2 sm:bottom-6 sm:w-[480px] sm:-translate-x-1/2 sm:rounded-[32px]"
              : "left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[32px]",
            className,
          )}
        >
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/20 sm:hidden" />
          <Dialog.Title className="pr-10 font-display text-2xl">{title}</Dialog.Title>
          {description ? <Dialog.Description className="mt-1 text-sm text-white/70">{description}</Dialog.Description> : <Dialog.Description className="sr-only">{title}</Dialog.Description>}
          <Dialog.Close className="absolute right-5 top-5 rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Close">
            <X className="h-5 w-5" />
          </Dialog.Close>
          <div className="mt-5">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
