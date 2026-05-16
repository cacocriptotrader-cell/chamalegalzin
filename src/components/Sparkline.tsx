import { useEffect, useState } from "react";

/**
 * Ultra-thin SVG sparkline. SSR-safe: renders nothing until mounted to avoid
 * hydration mismatches from ResponsiveContainer measurements.
 */
export function Sparkline({
  data,
  color = "rgb(52 211 153)",
  height = 36,
  fill = true,
}: {
  data: number[];
  color?: string;
  height?: number;
  fill?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || data.length < 2) return <div style={{ height }} />;

  const w = 100;
  const h = height;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return [x, y] as const;
  });
  const path = pts.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(" ");
  const area = `${path} L${w},${h} L0,${h} Z`;
  const gradId = `sg-${Math.abs(data.reduce((a, b) => a + b, 0)).toFixed(0)}-${color.length}`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height={h}
      preserveAspectRatio="none"
      className="block"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#${gradId})`} />}
      <path d={path} fill="none" stroke={color} strokeWidth={1} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** Deterministic pseudo-trend series ending on `endValue`. */
export function trendSeries(seed: number, endValue: number, points = 20, volatility = 0.08, drift = 0.02): number[] {
  let s = Math.abs(Math.sin(seed) * 1000) % 1;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const out: number[] = [];
  let v = endValue * (1 - drift * points);
  for (let i = 0; i < points; i++) {
    v += endValue * drift + (rand() - 0.5) * endValue * volatility;
    out.push(v);
  }
  // force last point to align
  out[out.length - 1] = endValue;
  return out;
}
