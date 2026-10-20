import type { Mood } from "@/lib/types";

/** Small illustrated "inner weather" icons for check-ins. */
export function MoodIcon({ mood, size = 56 }: { mood: Mood; size?: number }) {
  const cloud = (fill: string, dy = 0) => (
    <g fill={fill} transform={`translate(0 ${dy})`}>
      <circle cx="22" cy="34" r="10" />
      <circle cx="32" cy="28" r="12" />
      <circle cx="43" cy="34" r="9" />
      <rect x="14" y="33" width="38" height="11" rx="5.5" />
    </g>
  );
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
      <defs>
        <radialGradient id="sun-g">
          <stop offset="0%" stopColor="#fff3d6" />
          <stop offset="100%" stopColor="#ffb98f" />
        </radialGradient>
      </defs>
      {mood === "sunny" && (
        <g>
          {Array.from({ length: 8 }, (_, i) => (
            <rect key={i} x="31" y="6" width="2.5" height="8" rx="1.25" fill="#ffd2a6" transform={`rotate(${i * 45} 32 32)`} />
          ))}
          <circle cx="32" cy="32" r="13" fill="url(#sun-g)" />
        </g>
      )}
      {mood === "bright" && (
        <g>
          <circle cx="40" cy="24" r="11" fill="url(#sun-g)" />
          {cloud("#eef0ff", 4)}
        </g>
      )}
      {mood === "cloudy" && (
        <g>
          {cloud("#b8bfe6", -6)}
          {cloud("#e6e8fb", 4)}
        </g>
      )}
      {mood === "rainy" && (
        <g>
          {cloud("#a9b3e0", -4)}
          {[22, 32, 42].map((x) => (
            <rect key={x} x={x} y="46" width="2.5" height="8" rx="1.25" fill="#a9d6ff" transform={`rotate(15 ${x} 50)`} />
          ))}
        </g>
      )}
      {mood === "stormy" && (
        <g>
          {cloud("#7f86b8", -4)}
          <path d="M33 42 l-6 10 h6 l-3 9 l10 -13 h-6 l3 -6 z" fill="#ffd38a" />
        </g>
      )}
    </svg>
  );
}
