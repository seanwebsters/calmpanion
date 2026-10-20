"use client";

import * as SliderPrimitive from "@radix-ui/react-slider";
import * as React from "react";
import { cn } from "@/lib/utils";

export function Slider({ className, ...props }: React.ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root className={cn("relative flex h-6 w-full touch-none select-none items-center", className)} {...props}>
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-white/15">
        <SliderPrimitive.Range className="absolute h-full rounded-full bg-gradient-to-r from-lilac-400 to-peach-300" />
      </SliderPrimitive.Track>
      {(props.value ?? props.defaultValue ?? [0]).map((_, i) => (
        <SliderPrimitive.Thumb key={i} className="block h-5 w-5 rounded-full border-2 border-white bg-lilac-300 shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lilac-300/40" />
      ))}
    </SliderPrimitive.Root>
  );
}
