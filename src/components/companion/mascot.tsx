"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useId, useState } from "react";
import { cn } from "@/lib/utils";

export type MascotState = "idle" | "listening" | "thinking" | "speaking" | "sleeping" | "happy" | "waving";

interface MascotProps {
  state?: MascotState;
  size?: number;
  className?: string;
  /** turn off the floating motion (e.g. inside small buttons) */
  still?: boolean;
  label?: string;
}

// The cloud silhouette: a soft dome, two side puffs and two round lower lobes.
const PUFFS: [number, number, number][] = [
  [100, 116, 50],
  [102, 86, 50],
  [53, 112, 31],
  [149, 102, 33],
  [74, 141, 35],
  [130, 141, 37],
];

/**
 * Nimbus: a glossy, jelly-soft cloud that fades from sky blue through lavender to pink,
 * with two felt-button eyes. Pure SVG + Framer Motion so it stays crisp at any size and
 * can breathe, blink, float, listen, think, talk and sleep.
 */
export function Mascot({ state = "idle", size = 220, className, still, label = "Your companion" }: MascotProps) {
  const id = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const [blink, setBlink] = useState(false);
  const animate = !reduce && !still;

  useEffect(() => {
    if (reduce || state === "sleeping") return;
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      t = setTimeout(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 140);
        loop();
      }, 2200 + Math.random() * 3200);
    };
    loop();
    return () => clearTimeout(t);
  }, [reduce, state]);

  const sleeping = state === "sleeping";
  const happy = state === "happy";
  const thinking = state === "thinking";
  const speaking = state === "speaking";
  const listening = state === "listening";
  const waving = state === "waving";

  const breatheDur = sleeping ? 6 : 4.2;
  const eyeLook = thinking ? { x: 4, y: -5 } : listening ? { x: 0, y: -1 } : { x: 0, y: 0 };

  return (
    <div className={cn("relative select-none", className)} style={{ width: size, height: size }} role="img" aria-label={`${label}, ${state}`}>
      {/* aura */}
      <motion.div
        className="absolute inset-[10%] rounded-full blur-2xl"
        style={{ background: "radial-gradient(circle at 45% 40%, rgba(124,200,255,0.5), rgba(196,170,250,0.35) 45%, rgba(255,150,205,0.25) 65%, transparent 75%)" }}
        animate={animate ? { scale: speaking ? [1, 1.12, 1] : [1, 1.06, 1], opacity: sleeping ? [0.35, 0.5, 0.35] : [0.65, 0.9, 0.65] } : undefined}
        transition={{ duration: speaking ? 1.2 : breatheDur, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* listening rings */}
      <AnimatePresence>
        {listening &&
          [0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute inset-[18%] rounded-full border-2 border-sky-300/50"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [0.85, 1.45], opacity: [0.6, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.7, ease: "easeOut" }}
            />
          ))}
      </AnimatePresence>

      <motion.svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        className="relative overflow-visible"
        animate={animate ? (happy ? { y: [0, -12, 0] } : waving ? { y: [0, -6, 0], rotate: [0, -6, 5, -4, 0] } : { y: [0, -7, 0] }) : undefined}
        transition={{ duration: happy ? 0.9 : waving ? 1.8 : 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <defs>
          {/* body colour: sky blue → lavender → pink, in user space so every puff shares one gradient */}
          <linearGradient id={`body-${id}`} gradientUnits="userSpaceOnUse" x1="55" y1="45" x2="150" y2="185">
            <stop offset="0%" stopColor="#8fd8ff" />
            <stop offset="30%" stopColor="#7cc4fb" />
            <stop offset="58%" stopColor="#b9b6f8" />
            <stop offset="80%" stopColor="#f2a8e4" />
            <stop offset="100%" stopColor="#ff8fcb" />
          </linearGradient>
          <radialGradient id={`blush-${id}`} gradientUnits="userSpaceOnUse" cx="112" cy="158" r="62">
            <stop offset="0%" stopColor="#ff86c3" stopOpacity="0.85" />
            <stop offset="55%" stopColor="#ff9bd2" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ff9bd2" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`inner-${id}`} gradientUnits="userSpaceOnUse" cx="118" cy="78" r="70">
            <stop offset="0%" stopColor="#e6f7ff" stopOpacity="0.75" />
            <stop offset="45%" stopColor="#d4efff" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#d4efff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`eye-${id}`} cx="45%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#2a2228" />
            <stop offset="100%" stopColor="#0c080b" />
          </radialGradient>
          <filter id={`soft-${id}`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1.4" />
          </filter>
          <filter id={`glow-${id}`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
          <filter id={`felt-${id}`}>
            <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed="4" />
            <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.35 0" />
            <feComposite in2="SourceGraphic" operator="in" />
            <feBlend in="SourceGraphic" mode="screen" />
          </filter>
          <clipPath id={`clip-${id}`}>
            {PUFFS.map(([cx, cy, r], i) => (
              <circle key={i} cx={cx} cy={cy} r={r} />
            ))}
          </clipPath>
        </defs>

        {/* coloured under-glow, like light passing through jelly */}
        <motion.ellipse
          cx="102"
          cy="182"
          rx="58"
          ry="9"
          fill="#c48cf0"
          opacity="0.55"
          filter={`url(#glow-${id})`}
          animate={animate ? { rx: [58, 50, 58], opacity: [0.55, 0.35, 0.55] } : undefined}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* body: breathing */}
        <motion.g
          style={{ originX: "100px", originY: "176px" }}
          animate={animate ? { scaleX: [1, 1.025, 1], scaleY: [1, 1.045, 1] } : undefined}
          transition={{ duration: breatheDur, repeat: Infinity, ease: "easeInOut" }}
        >
          <g fill={`url(#body-${id})`}>
            {PUFFS.map(([cx, cy, r], i) => (
              <circle key={i} cx={cx} cy={cy} r={r} />
            ))}
          </g>

          {/* translucent depth, clipped to the silhouette */}
          <g clipPath={`url(#clip-${id})`}>
            <rect x="0" y="0" width="200" height="200" fill={`url(#inner-${id})`} />
            <rect x="0" y="0" width="200" height="200" fill={`url(#blush-${id})`} />
            {/* soft creases between the lower lobes and the body */}
            <path d="M44 128 q26 -14 56 -4" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="2" fill="none" filter={`url(#soft-${id})`} />
            <path d="M100 126 q30 -12 62 2" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="2" fill="none" filter={`url(#soft-${id})`} />
            <path d="M102 160 q1 10 0 20" stroke="#d86fb6" strokeOpacity="0.18" strokeWidth="6" fill="none" filter={`url(#soft-${id})`} />
            {/* rim light along the lower edge */}
            <ellipse cx="102" cy="190" rx="70" ry="16" fill="#ffd0ec" opacity="0.35" filter={`url(#soft-${id})`} />
          </g>

          {/* glossy specular highlights */}
          <g fill="#ffffff" filter={`url(#soft-${id})`}>
            <path d="M74 60 q16 -20 44 -18 q-30 6 -40 26 z" opacity="0.85" />
            <ellipse cx="128" cy="52" rx="9" ry="4" transform="rotate(18 128 52)" opacity="0.55" />
            <path d="M33 104 q4 -14 18 -18 q-10 8 -12 22 z" opacity="0.7" />
            <path d="M140 76 q12 -6 24 2 q-12 -1 -22 6 z" opacity="0.6" />
            <ellipse cx="62" cy="122" rx="10" ry="3.5" transform="rotate(-12 62 122)" opacity="0.45" />
            <ellipse cx="148" cy="124" rx="11" ry="3.5" transform="rotate(10 148 124)" opacity="0.4" />
          </g>

          {/* eyes */}
          <motion.g animate={eyeLook} transition={{ type: "spring", stiffness: 120, damping: 14 }}>
            {sleeping || happy ? (
              <g stroke="#140e12" strokeWidth="4.5" strokeLinecap="round" fill="none">
                {sleeping ? (
                  <>
                    <path d="M74 116 q8 7 16 0" />
                    <path d="M114 116 q8 7 16 0" />
                  </>
                ) : (
                  <>
                    <path d="M74 119 q8 -10 16 0" />
                    <path d="M114 119 q8 -10 16 0" />
                  </>
                )}
              </g>
            ) : (
              <g>
                {[82, 122].map((cx) => (
                  <motion.g key={cx} style={{ originX: `${cx}px`, originY: "114px" }} animate={{ scaleY: blink ? 0.1 : listening ? 1.12 : 1 }} transition={{ duration: 0.08 }}>
                    <ellipse cx={cx} cy="114" rx="8.5" ry="11.5" fill={`url(#eye-${id})`} filter={`url(#felt-${id})`} />
                    <ellipse cx={cx} cy="114" rx="8.5" ry="11.5" fill="none" stroke="#000" strokeOpacity="0.5" strokeWidth="0.8" strokeDasharray="1.2 1.4" />
                    <circle cx={cx + 2} cy="109" r="2.6" fill="#fffaf2" />
                  </motion.g>
                ))}
              </g>
            )}
          </motion.g>

          {/* mouth only appears while talking */}
          <AnimatePresence>
            {speaking && (
              <motion.ellipse
                cx="102"
                cy="136"
                rx="5"
                fill="#5a2a55"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.85, ry: [1.2, 4.5, 2, 4, 1.2] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9, repeat: Infinity }}
              />
            )}
          </AnimatePresence>
        </motion.g>

        {/* thinking sparkles */}
        <AnimatePresence>
          {thinking && (
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {[0, 1, 2].map((i) => (
                <motion.circle
                  key={i}
                  cx={156 + i * 11}
                  cy={50 - i * 10}
                  r={3 + i * 1.5}
                  fill="#e6dcff"
                  animate={{ opacity: [0.2, 1, 0.2], y: [0, -3, 0] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.25 }}
                />
              ))}
            </motion.g>
          )}
        </AnimatePresence>

        {/* sleeping z's */}
        <AnimatePresence>
          {sleeping && animate && (
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {[0, 1, 2].map((i) => (
                <motion.text
                  key={i}
                  x={152}
                  y={56}
                  fill="#e6dcff"
                  fontSize={12 + i * 4}
                  fontFamily="var(--font-display)"
                  animate={{ x: [152, 166 + i * 4], y: [56, 18 - i * 6], opacity: [0, 1, 0] }}
                  transition={{ duration: 3.6, repeat: Infinity, delay: i * 1.2, ease: "easeOut" }}
                >
                  z
                </motion.text>
              ))}
            </motion.g>
          )}
        </AnimatePresence>
      </motion.svg>
    </div>
  );
}
