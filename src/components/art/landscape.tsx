import type { ArtworkSpec } from "@/lib/types";
import { cn, hashString, seeded } from "@/lib/utils";

// Procedural, deterministic landscape artwork. Same output on server and client, scales
// from tiny thumbnails to full-screen backgrounds, and needs no image assets.

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
export function mix(a: string, b: string, t: number) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const c = ca.map((v, i) => Math.round(v + (cb[i] - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

const W = 400;
const H = 300;

function ridge(rand: () => number, base: number, amp: number, points: number) {
  const step = W / points;
  let d = `M0 ${H} L0 ${base + (rand() - 0.5) * amp}`;
  let prevX = 0;
  let prevY = base;
  for (let i = 1; i <= points; i++) {
    const x = i * step;
    const y = base - rand() * amp + amp * 0.3;
    const cx = prevX + step / 2;
    d += ` Q${cx} ${Math.min(prevY, y) - amp * 0.35 * rand()} ${x} ${y}`;
    prevX = x;
    prevY = y;
  }
  return `${d} L${W} ${H} Z`;
}

function hills(rand: () => number, base: number, amp: number, n: number) {
  const step = W / n;
  let d = `M0 ${H} L0 ${base}`;
  for (let i = 0; i < n; i++) {
    const x1 = i * step + step / 2;
    const x2 = (i + 1) * step;
    d += ` Q${x1} ${base - amp * (0.5 + rand() * 0.5)} ${x2} ${base + (rand() - 0.5) * amp * 0.3}`;
  }
  return `${d} L${W} ${H} Z`;
}

interface LandscapeProps {
  spec: ArtworkSpec;
  seed?: string;
  animated?: boolean;
  className?: string;
  /** extra detail for large hero/background renders */
  detail?: "low" | "high";
}

export function Landscape({ spec, seed = "x", animated = false, className, detail = "low" }: LandscapeProps) {
  const rand = seeded(hashString(seed + spec.scene));
  const [top, mid, horizon] = spec.palette;
  const uid = `ls${hashString(seed + JSON.stringify(spec)).toString(36)}`;
  const dark = "#070b26";
  const far = mix(mid, horizon, 0.35);
  const midLand = mix(mid, dark, 0.45);
  const near = mix(top, dark, 0.6);
  const horizonY = spec.scene === "ocean" || spec.scene === "lake" ? 175 : 190;
  const starCount = detail === "high" ? 70 : 28;

  const stars = spec.stars
    ? Array.from({ length: starCount }, () => ({ x: rand() * W, y: rand() * 150, r: 0.4 + rand() * 1.1, d: rand() * 4 }))
    : [];
  const clouds = Array.from({ length: detail === "high" ? 4 : 2 }, (_, i) => ({ x: rand() * W, y: 30 + rand() * 80, w: 60 + rand() * 90, i }));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className={cn("h-full w-full", className)} aria-hidden>
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={top} />
          <stop offset="55%" stopColor={mid} />
          <stop offset="100%" stopColor={horizon} />
        </linearGradient>
        <linearGradient id={`${uid}-water`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={mix(horizon, mid, 0.3)} />
          <stop offset="100%" stopColor={mix(top, dark, 0.5)} />
        </linearGradient>
        <radialGradient id={`${uid}-glow`}>
          <stop offset="0%" stopColor="#fff6e8" stopOpacity="0.9" />
          <stop offset="40%" stopColor={spec.sun ? "#ffd2a6" : "#e6dcff"} stopOpacity="0.35" />
          <stop offset="100%" stopColor={spec.sun ? "#ffd2a6" : "#e6dcff"} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${uid}-warm`}>
          <stop offset="0%" stopColor="#ffd9a0" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#ffb07a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}-mist`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={horizon} stopOpacity="0" />
          <stop offset="50%" stopColor={horizon} stopOpacity="0.45" />
          <stop offset="100%" stopColor={horizon} stopOpacity="0" />
        </linearGradient>
        <filter id={`${uid}-blur`} x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      <rect width={W} height={H} fill={`url(#${uid}-sky)`} />

      {stars.map((s, i) => (
        <circle
          key={i}
          cx={s.x}
          cy={s.y}
          r={s.r}
          fill="#fff"
          opacity={0.75}
          className={animated ? "animate-twinkle" : undefined}
          style={animated ? { animationDelay: `${s.d}s` } : undefined}
        />
      ))}

      {spec.moon && (
        <g>
          <circle cx="312" cy="62" r="44" fill={`url(#${uid}-glow)`} />
          <circle cx="312" cy="62" r="15" fill="#fdf7ea" />
          <circle cx="318" cy="58" r="13" fill={mix(top, mid, 0.3)} opacity="0.18" />
        </g>
      )}
      {spec.sun && (
        <g>
          <circle cx="200" cy={horizonY - 18} r="80" fill={`url(#${uid}-glow)`} />
          <circle cx="200" cy={horizonY - 18} r="24" fill="#fff1d6" opacity="0.95" />
        </g>
      )}

      {clouds.map((c) => (
        <g key={c.i} className={animated ? "animate-drift" : undefined} style={animated ? { animationDelay: `${-c.i * 22}s`, animationDuration: `${80 + c.i * 25}s` } : undefined}>
          <ellipse cx={animated ? 0 : c.x} cy={c.y} rx={c.w / 2} ry={c.w / 9} fill="#ffffff" opacity="0.13" filter={`url(#${uid}-blur)`} />
        </g>
      ))}

      <Terrain spec={spec} rand={rand} uid={uid} far={far} midLand={midLand} near={near} horizonY={horizonY} animated={animated} detail={detail} />

      <rect y={horizonY - 30} width={W} height="60" fill={`url(#${uid}-mist)`} fillOpacity="0.7" className={animated ? "animate-twinkle" : undefined} style={animated ? { animationDuration: "14s" } : undefined} />
    </svg>
  );
}

interface TerrainProps {
  spec: ArtworkSpec;
  rand: () => number;
  uid: string;
  far: string;
  midLand: string;
  near: string;
  horizonY: number;
  animated: boolean;
  detail: "low" | "high";
}

function Terrain({ spec, rand, uid, far, midLand, near, horizonY, animated, detail }: TerrainProps) {
  const lm = spec.landmark ?? "none";
  switch (spec.scene) {
    case "ocean":
    case "lake": {
      const waves = Array.from({ length: detail === "high" ? 14 : 7 }, (_, i) => ({ y: horizonY + 8 + i * 9 + rand() * 4, x: rand() * W, w: 20 + rand() * 60 }));
      return (
        <g>
          {spec.scene === "lake" && <path d={ridge(rand, horizonY - 30, 45, 7)} fill={far} opacity="0.85" />}
          {spec.scene === "ocean" && lm === "lighthouse" && <path d={hills(rand, horizonY - 4, 26, 2)} fill={midLand} transform={`translate(160 0)`} />}
          <rect y={horizonY} width={W} height={H - horizonY} fill={`url(#${uid}-water)`} />
          {spec.moon && <rect x="302" y={horizonY + 4} width="20" height={H - horizonY} fill="#fdf7ea" opacity="0.12" filter={`url(#${uid}-blur)`} />}
          {spec.sun && <rect x="180" y={horizonY + 4} width="40" height={H - horizonY} fill="#fff1d6" opacity="0.18" filter={`url(#${uid}-blur)`} />}
          {waves.map((w, i) => (
            <line key={i} x1={w.x} x2={w.x + w.w} y1={w.y} y2={w.y} stroke="#ffffff" strokeOpacity={0.08 + (i / waves.length) * 0.1} strokeWidth="1.2" strokeLinecap="round" />
          ))}
          {spec.scene === "lake" && <path d={hills(rand, H - 18, 24, 3)} fill={near} />}
          {lm === "lighthouse" && <Lighthouse x={300} y={horizonY - 4} uid={uid} animated={animated} />}
          {lm === "boat" && <Boat x={150 + rand() * 80} y={horizonY + 34} />}
          {lm === "tree" && <RoundTree x={60} y={H - 22} color={near} />}
        </g>
      );
    }
    case "forest": {
      const trees = (y: number, n: number, h: number, color: string) =>
        Array.from({ length: n }, (_, i) => {
          const x = (i / n) * W + rand() * (W / n);
          const th = h * (0.7 + rand() * 0.6);
          return <path key={`${y}-${i}`} d={`M${x} ${y - th} L${x - th * 0.32} ${y} L${x + th * 0.32} ${y} Z`} fill={color} />;
        });
      return (
        <g>
          <path d={ridge(rand, horizonY - 25, 35, 6)} fill={far} opacity="0.7" />
          <path d={hills(rand, horizonY + 10, 18, 3)} fill={midLand} />
          {trees(horizonY + 14, 22, 40, midLand)}
          <path d={hills(rand, H - 40, 20, 2)} fill={near} />
          {trees(H - 30, 12, 70, near)}
          {lm === "cabin" && <Cabin x={190} y={H - 44} uid={uid} />}
        </g>
      );
    }
    case "desert":
      return (
        <g>
          <path d={hills(rand, horizonY - 5, 22, 3)} fill={far} opacity="0.9" />
          <path d={hills(rand, horizonY + 30, 30, 2)} fill={midLand} />
          <path d={hills(rand, H - 25, 28, 2)} fill={near} />
          {lm === "tent" && <Tent x={250} y={H - 50} uid={uid} />}
        </g>
      );
    case "meadow": {
      const flowers = Array.from({ length: detail === "high" ? 40 : 16 }, () => ({ x: rand() * W, y: H - 40 + rand() * 38 }));
      return (
        <g>
          <path d={hills(rand, horizonY - 10, 30, 3)} fill={far} opacity="0.85" />
          <path d={hills(rand, horizonY + 25, 25, 2)} fill={midLand} />
          <path d={hills(rand, H - 35, 18, 2)} fill={near} />
          {flowers.map((f, i) => (
            <circle key={i} cx={f.x} cy={f.y} r="1.4" fill={i % 3 ? "#fdf7ea" : "#ffc9b0"} opacity="0.7" />
          ))}
          {lm === "lantern" && <Lantern x={120} y={H - 30} uid={uid} />}
          {lm === "tree" && <RoundTree x={300} y={H - 34} color={near} />}
        </g>
      );
    }
    case "snow": {
      const flakes = Array.from({ length: detail === "high" ? 50 : 20 }, () => ({ x: rand() * W, y: rand() * H, r: 0.6 + rand() * 1.2 }));
      return (
        <g>
          <path d={ridge(rand, horizonY - 40, 60, 6)} fill={mix(far, "#ffffff", 0.35)} opacity="0.9" />
          <path d={ridge(rand, horizonY, 40, 5)} fill={mix(midLand, "#ffffff", 0.2)} />
          <path d={hills(rand, H - 40, 16, 2)} fill={mix(near, "#c7d0f5", 0.35)} />
          {lm === "train" && <Train y={H - 52} uid={uid} />}
          {lm === "cabin" && <Cabin x={260} y={H - 50} uid={uid} />}
          {flakes.map((f, i) => (
            <circle key={i} cx={f.x} cy={f.y} r={f.r} fill="#fff" opacity="0.6" />
          ))}
        </g>
      );
    }
    case "clouds":
      return (
        <g>
          {[0, 1, 2].map((i) => (
            <g key={i} opacity={0.35 + i * 0.25}>
              {Array.from({ length: 6 }, (_, j) => (
                <circle key={j} cx={j * 80 + rand() * 30 - 20} cy={horizonY + i * 30 + rand() * 10} r={40 + rand() * 25} fill={mix("#ffffff", near, 0.25 + i * 0.25)} />
              ))}
            </g>
          ))}
        </g>
      );
    case "night":
      return (
        <g>
          <path d={hills(rand, horizonY, 25, 3)} fill={midLand} />
          <path d={hills(rand, H - 30, 20, 2)} fill={near} />
          {lm === "lantern" && <Lantern x={200} y={H - 26} uid={uid} />}
        </g>
      );
    case "sunrise":
    case "mountains":
    default:
      return (
        <g>
          <path d={ridge(rand, horizonY - 45, 70, 6)} fill={far} opacity="0.85" />
          <path d={ridge(rand, horizonY - 5, 50, 5)} fill={midLand} />
          <path d={hills(rand, H - 30, 22, 3)} fill={near} />
          {lm === "tree" && <RoundTree x={80} y={H - 30} color={near} />}
          {lm === "cabin" && <Cabin x={260} y={H - 44} uid={uid} />}
        </g>
      );
  }
}

function Lighthouse({ x, y, uid, animated }: { x: number; y: number; uid: string; animated: boolean }) {
  return (
    <g>
      {/* fillOpacity keeps the beam faint even while the twinkle animation drives opacity */}
      <path d={`M${x} ${y - 66} L${x - 140} ${y - 90} L${x - 140} ${y - 50} Z`} fill="#fff4d6" fillOpacity="0.1" className={animated ? "animate-twinkle" : undefined} style={animated ? { animationDuration: "6s" } : undefined} />
      <path d={`M${x - 7} ${y} L${x - 4} ${y - 60} L${x + 4} ${y - 60} L${x + 7} ${y} Z`} fill="#e9e4f7" />
      <rect x={x - 6} y={y - 40} width="12" height="5" fill="#d47a74" />
      <rect x={x - 5} y={y - 22} width="10" height="5" fill="#d47a74" />
      <rect x={x - 5} y={y - 68} width="10" height="8" fill="#ffe8b0" />
      <circle cx={x} cy={y - 64} r="16" fill={`url(#${uid}-warm)`} />
      <path d={`M${x - 7} ${y - 68} L${x} ${y - 75} L${x + 7} ${y - 68} Z`} fill="#3a3560" />
    </g>
  );
}

function Cabin({ x, y, uid }: { x: number; y: number; uid: string }) {
  return (
    <g>
      <circle cx={x + 6} cy={y + 8} r="26" fill={`url(#${uid}-warm)`} opacity="0.6" />
      <rect x={x - 16} y={y} width="36" height="22" fill="#2a2347" />
      <path d={`M${x - 20} ${y + 1} L${x + 2} ${y - 16} L${x + 24} ${y + 1} Z`} fill="#1b1638" />
      <rect x={x - 9} y={y + 6} width="8" height="7" fill="#ffd38a" />
      <rect x={x + 7} y={y + 6} width="8" height="7" fill="#ffd38a" opacity="0.85" />
      <rect x={x + 10} y={y - 14} width="4" height="8" fill="#1b1638" />
    </g>
  );
}

function Tent({ x, y, uid }: { x: number; y: number; uid: string }) {
  return (
    <g>
      <circle cx={x - 24} cy={y + 20} r="22" fill={`url(#${uid}-warm)`} />
      <circle cx={x - 24} cy={y + 22} r="2.5" fill="#ffcf80" />
      <path d={`M${x - 18} ${y + 24} L${x} ${y} L${x + 18} ${y + 24} Z`} fill="#3a2b52" />
      <path d={`M${x - 3} ${y + 24} L${x} ${y + 10} L${x + 3} ${y + 24} Z`} fill="#ffcf80" opacity="0.8" />
    </g>
  );
}

function Lantern({ x, y, uid }: { x: number; y: number; uid: string }) {
  return (
    <g>
      <circle cx={x} cy={y - 26} r="20" fill={`url(#${uid}-warm)`} />
      <rect x={x - 1} y={y - 24} width="2" height="24" fill="#1b1638" />
      <rect x={x - 4} y={y - 32} width="8" height="9" rx="2" fill="#ffd38a" />
    </g>
  );
}

function Boat({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <path d={`M${x - 16} ${y} L${x + 16} ${y} L${x + 11} ${y + 6} L${x - 11} ${y + 6} Z`} fill="#1b1638" />
      <rect x={x - 0.75} y={y - 20} width="1.5" height="20" fill="#1b1638" />
      <path d={`M${x + 1} ${y - 19} L${x + 13} ${y - 2} L${x + 1} ${y - 2} Z`} fill="#e9e4f7" opacity="0.85" />
    </g>
  );
}

function Train({ y, uid }: { y: number; uid: string }) {
  return (
    <g>
      <rect x="0" y={y + 16} width={W} height="2" fill="#1b1638" opacity="0.7" />
      {[60, 112, 164, 216].map((x, i) => (
        <g key={x}>
          <rect x={x} y={y} width="48" height="16" rx="3" fill="#2a2347" />
          {[6, 18, 30].map((wx) => (
            <rect key={wx} x={x + wx} y={y + 4} width="8" height="6" fill="#ffd38a" opacity={0.7 + (i % 2) * 0.3} />
          ))}
        </g>
      ))}
      <circle cx="140" cy={y + 8} r="70" fill={`url(#${uid}-warm)`} opacity="0.25" />
    </g>
  );
}

function RoundTree({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g>
      <rect x={x - 2} y={y - 22} width="4" height="22" fill={color} />
      <circle cx={x} cy={y - 32} r="18" fill={color} />
      <circle cx={x - 12} cy={y - 24} r="11" fill={color} />
      <circle cx={x + 12} cy={y - 24} r="11" fill={color} />
    </g>
  );
}
