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

/**
 * Nimbus: a soft, luminous cloud creature. Pure SVG + Framer Motion so it's crisp at any
 * size, themable and cheap to animate. Breathes, blinks, floats, listens, thinks, talks and sleeps.
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
  const happy = state === "happy" || state === "waving";
  const thinking = state === "thinking";
  const speaking = state === "speaking";
  const listening = state === "listening";

  const breatheDur = sleeping ? 6 : 4.2;
  const eyeLook = thinking ? { x: 3, y: -4 } : listening ? { x: 0, y: -1 } : { x: 0, y: 0 };

  return (
    <div className={cn("relative select-none", className)} style={{ width: size, height: size }} role="img" aria-label={`${label}, ${state}`}>
      {/* aura */}
      <motion.div
        className="absolute inset-[8%] rounded-full blur-2xl"
        style={{ background: "radial-gradient(circle, rgba(196,180,255,0.55), rgba(127,191,255,0.18) 55%, transparent 70%)" }}
        animate={animate ? { scale: speaking ? [1, 1.12, 1] : [1, 1.06, 1], opacity: sleeping ? [0.35, 0.5, 0.35] : [0.6, 0.85, 0.6] } : undefined}
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
        animate={animate ? { y: state === "happy" ? [0, -10, 0] : [0, -7, 0] } : undefined}
        transition={{ duration: state === "happy" ? 0.9 : 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <defs>
          <radialGradient id={`body-${id}`} cx="40%" cy="32%" r="75%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="38%" stopColor="#f1efff" />
            <stop offset="70%" stopColor="#d3cbfa" />
            <stop offset="100%" stopColor="#a9bff4" />
          </radialGradient>
          <radialGradient id={`belly-${id}`} cx="50%" cy="70%" r="55%">
            <stop offset="0%" stopColor="#ffe6dc" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#ffe6dc" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`cheek-${id}`}>
            <stop offset="0%" stopColor="#ffab9a" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#ffab9a" stopOpacity="0" />
          </radialGradient>
          <filter id={`soft-${id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.2" />
          </filter>
          <filter id={`shadow-${id}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        {/* ground shadow */}
        <motion.ellipse
          cx="100"
          cy="188"
          rx="46"
          ry="7"
          fill="#050822"
          opacity="0.35"
          filter={`url(#shadow-${id})`}
          animate={animate ? { rx: [46, 40, 46], opacity: [0.35, 0.22, 0.35] } : undefined}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* feet */}
        <ellipse cx="84" cy="170" rx="11" ry="7" fill="#c3c6f3" />
        <ellipse cx="116" cy="170" rx="11" ry="7" fill="#c3c6f3" />

        {/* arms */}
        <motion.g style={{ originX: "48px", originY: "128px" }} animate={animate && happy ? { rotate: [0, -12, 0] } : undefined} transition={{ duration: 1.4, repeat: Infinity }}>
          <ellipse cx="40" cy="134" rx="12" ry="9" fill="#dcd6fb" transform="rotate(-25 40 134)" />
        </motion.g>
        <motion.g
          style={{ originX: "152px", originY: "128px" }}
          animate={animate && state === "waving" ? { rotate: [0, -38, -10, -38, 0] } : animate && happy ? { rotate: [0, 12, 0] } : undefined}
          transition={{ duration: state === "waving" ? 1.6 : 1.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <ellipse cx="160" cy="134" rx="12" ry="9" fill="#dcd6fb" transform="rotate(25 160 134)" />
        </motion.g>

        {/* body: breathing */}
        <motion.g
          style={{ originX: "100px", originY: "165px" }}
          animate={animate ? { scaleX: [1, 1.025, 1], scaleY: [1, 1.045, 1] } : undefined}
          transition={{ duration: breatheDur, repeat: Infinity, ease: "easeInOut" }}
        >
          <g fill={`url(#body-${id})`}>
            <circle cx="100" cy="112" r="56" />
            <circle cx="56" cy="122" r="36" />
            <circle cx="144" cy="122" r="36" />
            <circle cx="76" cy="80" r="32" />
            <circle cx="124" cy="76" r="35" />
            <rect x="46" y="112" width="108" height="56" rx="28" />
          </g>
          <ellipse cx="100" cy="140" rx="46" ry="26" fill={`url(#belly-${id})`} />
          {/* rim highlight */}
          <path d="M70 62 q18 -16 40 -10" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.8" filter={`url(#soft-${id})`} />

          {/* cheeks */}
          <motion.ellipse cx="66" cy="128" rx="12" ry="8" fill={`url(#cheek-${id})`} animate={happy ? { opacity: [0.7, 1, 0.7] } : { opacity: 0.75 }} transition={{ duration: 1.5, repeat: Infinity }} />
          <motion.ellipse cx="134" cy="128" rx="12" ry="8" fill={`url(#cheek-${id})`} animate={happy ? { opacity: [0.7, 1, 0.7] } : { opacity: 0.75 }} transition={{ duration: 1.5, repeat: Infinity }} />

          {/* eyes */}
          <motion.g animate={eyeLook} transition={{ type: "spring", stiffness: 120, damping: 14 }}>
            {sleeping || happy ? (
              <g stroke="#1d2155" strokeWidth="4" strokeLinecap="round" fill="none">
                {sleeping ? (
                  <>
                    <path d="M74 114 q8 6 16 0" />
                    <path d="M110 114 q8 6 16 0" />
                  </>
                ) : (
                  <>
                    <path d="M74 116 q8 -9 16 0" />
                    <path d="M110 116 q8 -9 16 0" />
                  </>
                )}
              </g>
            ) : (
              <g>
                {[82, 118].map((cx) => (
                  <motion.g key={cx} style={{ originX: `${cx}px`, originY: "112px" }} animate={{ scaleY: blink ? 0.1 : listening ? 1.12 : 1 }} transition={{ duration: 0.08 }}>
                    <ellipse cx={cx} cy="112" rx="7.5" ry="9.5" fill="#1d2155" />
                    <circle cx={cx + 2.5} cy="108" r="3" fill="#ffffff" />
                    <circle cx={cx - 2.5} cy="116" r="1.4" fill="#ffffff" opacity="0.7" />
                  </motion.g>
                ))}
              </g>
            )}
          </motion.g>

          {/* mouth */}
          {speaking ? (
            <motion.ellipse cx="100" cy="132" rx="6" fill="#4a2a5c" animate={{ ry: [1.5, 5, 2.5, 4.5, 1.5] }} transition={{ duration: 0.9, repeat: Infinity }} />
          ) : thinking ? (
            <ellipse cx="104" cy="132" rx="3.2" ry="3" fill="#4a2a5c" />
          ) : sleeping ? (
            <ellipse cx="100" cy="132" rx="3" ry="2" fill="#4a2a5c" opacity="0.7" />
          ) : (
            <path d={happy ? "M90 128 q10 12 20 0" : "M93 129 q7 6 14 0"} stroke="#4a2a5c" strokeWidth="3.5" strokeLinecap="round" fill={happy ? "#ff9aa2" : "none"} />
          )}
        </motion.g>

        {/* thinking sparkles */}
        <AnimatePresence>
          {thinking && (
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {[0, 1, 2].map((i) => (
                <motion.circle
                  key={i}
                  cx={150 + i * 12}
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
                  x={150}
                  y={60}
                  fill="#e6dcff"
                  fontSize={12 + i * 4}
                  fontFamily="var(--font-display)"
                  animate={{ x: [150, 165 + i * 4], y: [60, 20 - i * 6], opacity: [0, 1, 0] }}
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
