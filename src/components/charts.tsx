/**
 * Shared animated chart primitives used across Analytics and Digital Twin.
 * Extracted so every score visualization looks and animates identically.
 */
import { useRef, useEffect } from "react";
import { motion, useInView, animate } from "framer-motion";

export function CountUp({ to, decimals = 0 }: { to: number; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView || !ref.current) return;
    const c = animate(0, to, {
      duration: 0.9, ease: [0.25, 0.1, 0.25, 1],
      onUpdate(v) { if (ref.current) ref.current.textContent = v.toFixed(decimals); },
    });
    return c.stop;
  }, [inView, to, decimals]);
  return <span ref={ref}>0</span>;
}

export function AnimatedBar({ pct, color }: { pct: number; color: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <div ref={ref} className="h-1.5 rounded-full bg-secondary overflow-hidden">
      <motion.div className="h-full rounded-full" initial={{ width: 0 }}
        animate={inView ? { width: `${Math.max(0, Math.min(100, pct))}%` } : {}}
        transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1], delay: 0.1 }}
        style={{ background: color }} />
    </div>
  );
}

export function AreaChart({ data, color = "var(--coral)", height = 100, emptyLabel = "Log at least 2 entries to see the trend" }:
  { data: { label: string; value: number }[]; color?: string; height?: number; emptyLabel?: string }) {
  const ref = useRef<SVGPathElement>(null);
  const inView = useInView(ref, { once: true });
  if (data.length < 2) return (
    <div className="h-24 flex items-center justify-center rounded-2xl bg-secondary">
      <p className="text-sm text-muted-foreground text-center px-4">{emptyLabel}</p>
    </div>
  );
  const vals = data.map((d) => d.value);
  const max = Math.max(...vals) + 0.2, min = Math.min(...vals) - 0.2, range = max - min || 0.1;
  const w = 300, h = height, pad = 8;
  const x = (i: number) => pad + (i / (data.length - 1)) * (w - pad * 2);
  const y = (v: number) => h - pad - ((v - min) / range) * (h - pad * 2);
  const pts = data.map((d, i) => ({ x: x(i), y: y(d.value) }));
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const area = `${line} L ${pts[pts.length - 1].x} ${h} L ${pts[0].x} ${h} Z`;
  const gradId = `ag-${color.replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <div className="w-full">
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <defs><linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.3" /><stop offset="100%" stopColor={color} stopOpacity="0.02" /></linearGradient></defs>
        <motion.path d={area} fill={`url(#${gradId})`} initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ duration: 0.5, delay: 0.2 }} />
        <motion.path ref={ref} d={line} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }} animate={inView ? { pathLength: 1, opacity: 1 } : {}} transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }} />
        <motion.circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="5" fill={color}
          initial={{ scale: 0 }} animate={inView ? { scale: 1 } : {}} transition={{ type: "spring", stiffness: 500, delay: 0.9 }} />
      </svg>
      <div className="flex justify-between mt-1">
        {data.filter((_, i) => i === 0 || i === Math.floor(data.length / 2) || i === data.length - 1).map((d) => (
          <span key={d.label} className="text-[10px] text-muted-foreground">{d.label}</span>
        ))}
      </div>
    </div>
  );
}

export function CircularProgress({ score, size = 128, stroke = 8 }: { score: number; size?: number; stroke?: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const r = (size - stroke) / 2, cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r, progress = (Math.max(0, Math.min(100, score)) / 100) * circ;
  return (
    <svg ref={ref} width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-secondary)" strokeWidth={stroke} />
      <motion.circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--coral)" strokeWidth={stroke}
        strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`}
        initial={{ strokeDasharray: `0 ${circ}` }}
        animate={inView ? { strokeDasharray: `${progress} ${circ}` } : {}}
        transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1], delay: 0.2 }} />
      <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.19} fontWeight="600" fill="currentColor">
        <CountUp to={score} />
      </text>
    </svg>
  );
}
