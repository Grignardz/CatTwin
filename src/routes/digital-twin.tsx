import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  PawPrint,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  ChevronRight,
  Syringe,
  Droplets,
  Activity as ActivityIcon,
  Moon,
  UtensilsCrossed,
  HeartPulse,
  Weight as WeightIcon,
  Gauge,
  Zap,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PhoneShell } from "@/components/PhoneShell";
import { useAuth } from "@/lib/auth";
import { computeDigitalTwin, type TwinModule } from "@/lib/digitalTwin";
import { generateHealthNarrative } from "@/lib/geminiPrediction";
import { CircularProgress, AnimatedBar } from "@/components/charts";
import {
  pageVariants,
  childVariants,
  cardVariants,
  staggerContainer,
  slideUpVariants,
  tapScale,
} from "@/lib/motion";

export const Route = createFileRoute("/digital-twin")({
  head: () => ({ meta: [{ title: "Digital Twin — CatTwin AI" }] }),
  component: DigitalTwin,
});

const MODULE_ICONS: Record<string, typeof PawPrint> = {
  body: Gauge,
  weight: WeightIcon,
  nutrition: UtensilsCrossed,
  hydration: Droplets,
  sleep: Moon,
  activity: ActivityIcon,
  stress: Zap,
  vaccination: Syringe,
  medical: HeartPulse,
};

function TrendIcon({ trend }: { trend: "up" | "down" | "stable" }) {
  if (trend === "up") return <TrendingUp size={12} className="text-emerald-500" />;
  if (trend === "down") return <TrendingDown size={12} className="text-red-400" />;
  return <Minus size={12} className="text-muted-foreground" />;
}

function scoreColor(score: number) {
  if (score >= 75) return "#10b981";
  if (score >= 50) return "var(--warm-yellow)";
  return "#ef4444";
}

// ── Module detail card (expandable) ───────────────────────────────────────────
function ModuleCard({ module }: { module: TwinModule }) {
  const [open, setOpen] = useState(false);
  const Icon = MODULE_ICONS[module.key] ?? PawPrint;

  return (
    <motion.div
      variants={slideUpVariants}
      className="bg-card rounded-2xl overflow-hidden shadow-[0_4px_16px_-8px_rgba(0,0,0,0.1)]"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div className="w-10 h-10 rounded-xl bg-[var(--coral-soft)] flex items-center justify-center shrink-0">
          <Icon size={17} style={{ color: "var(--coral)" }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{module.label}</p>
          {module.hasData ? (
            <div className="flex items-center gap-1 mt-0.5">
              <TrendIcon trend={module.trend} />
              <span className="text-xs text-muted-foreground">
                {module.score}/100 · {module.confidence}% confidence
              </span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5">No data yet</p>
          )}
        </div>
        <motion.div
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <ChevronRight size={16} className="text-muted-foreground" />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              {module.hasData && (
                <div className="mb-3">
                  <AnimatedBar pct={module.score} color={scoreColor(module.score)} />
                </div>
              )}
              <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                {module.explanation}
              </p>
              <div className="bg-secondary rounded-xl p-3 flex items-start gap-2">
                <Sparkles size={13} className="text-[var(--coral)] mt-0.5 shrink-0" />
                <p className="text-xs text-foreground/80 leading-relaxed">{module.suggestion}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Evolution timeline (mini bar chart) ───────────────────────────────────────
function EvolutionTimeline({ points }: { points: { label: string; score: number }[] }) {
  if (points.length === 0) {
    return (
      <div className="h-20 flex items-center justify-center rounded-2xl bg-secondary">
        <p className="text-sm text-muted-foreground">No history yet</p>
      </div>
    );
  }
  const max = 100;
  return (
    <div className="flex items-end gap-1.5 h-24">
      {points.map((p, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${(p.score / max) * 100}%` }}
            transition={{ duration: 0.6, delay: i * 0.04, ease: [0.25, 0.1, 0.25, 1] }}
            className="w-full rounded-t-md"
            style={{ background: scoreColor(p.score), minHeight: 4 }}
          />
          <span className="text-[8px] text-muted-foreground whitespace-nowrap">{p.label}</span>
        </div>
      ))}
    </div>
  );
}

function DigitalTwin() {
  const { user } = useAuth();
  const cats = user?.cats ?? [];
  const activeCat = cats[0] ?? null;

  const twin = useMemo(() => computeDigitalTwin(user, activeCat?.id ?? ""), [user, activeCat?.id]);

  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [predictionInsight, setPredictionInsight] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeCat || !twin.hasAnyData) {
      setAiSummary(null);
      setPredictionInsight(null);
      return;
    }
    let cancelled = false;
    setSummaryLoading(true);
    setSummaryError(null);
    generateHealthNarrative(activeCat, twin)
      .then((narrative) => {
        if (cancelled) return;
        setAiSummary(narrative.summary);
        setPredictionInsight(narrative.predictionInsight);
      })
      .catch((err) => {
        if (cancelled) return;
        setSummaryError(err instanceof Error ? err.message : "Failed to generate AI summary.");
      })
      .finally(() => {
        if (!cancelled) setSummaryLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCat?.id, twin.overallScore, twin.hasAnyData]);

  if (!activeCat) {
    return (
      <PhoneShell>
        <div className="px-6 pt-12 pb-4 flex items-center gap-3">
          <Link
            to="/"
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="font-serif text-xl font-semibold flex-1 text-center pr-9">CatTwin</h1>
        </div>
        <div className="px-6 py-16 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-[var(--coral-soft)] flex items-center justify-center mb-5">
            <PawPrint size={40} style={{ color: "var(--coral)" }} />
          </div>
          <h2 className="font-serif text-xl font-semibold mb-2">No cat added yet</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-[240px]">
            Add a cat to activate their AI Digital Twin.
          </p>
          <Link
            to="/"
            className="bg-[var(--nav-dark)] text-white text-sm font-medium rounded-2xl px-5 py-3 hover:bg-[var(--coral)] transition-colors"
          >
            Go to Home
          </Link>
        </div>
      </PhoneShell>
    );
  }

  return (
    <PhoneShell>
      <motion.div variants={pageVariants} initial="hidden" animate="visible" exit="exit">
        <motion.div variants={childVariants} className="px-6 pt-12 pb-4 flex items-center gap-3">
          <motion.div whileTap={tapScale}>
            <Link
              to="/"
              className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"
            >
              <ArrowLeft size={18} />
            </Link>
          </motion.div>
          <h1 className="font-serif text-xl font-semibold flex-1 text-center pr-9">CatTwin</h1>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="px-6 space-y-5 pb-8"
        >
          {/* ── Hero: overall score ── */}
          <motion.div
            variants={cardVariants}
            className="relative overflow-hidden rounded-3xl text-white shadow-[0_16px_48px_-16px_rgba(0,0,0,0.35)]"
          >
            {/* Cat photo fills the entire card as a background */}
            {activeCat.photo ? (
              <img
                src={activeCat.photo}
                alt={activeCat.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--nav-dark)] via-[var(--nav-dark)] to-[oklch(0.24_0.05_35)] flex items-center justify-center">
                <PawPrint size={64} className="text-white/15" />
              </div>
            )}
            {/* Gradient overlay for text legibility — darkened further so text/ring stay
                readable regardless of the photo's own colors and lighting. */}
            <div className="absolute inset-0 bg-black/55" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/30" />
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.28, 0.15] }}
              transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
              className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-[var(--coral)] blur-3xl pointer-events-none"
            />

            <div className="relative p-6">
              <p className="font-serif text-lg font-semibold leading-tight drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                {activeCat.name}
              </p>

              <div className="flex items-center gap-5 mt-4">
                {/* Dark backdrop disc behind the ring so the score stays legible
                    no matter how light/busy the photo is underneath it. */}
                <div className="relative rounded-full bg-black/45 backdrop-blur-[2px] p-1">
                  <CircularProgress score={twin.overallScore} size={104} stroke={9} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-white/80 uppercase tracking-wide mb-1 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                    Overall Health Score
                  </p>
                  <p className="text-xs text-white/70 mb-2 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                    AI Confidence: {twin.overallConfidence}%
                  </p>
                  <AnimatedBar pct={twin.overallConfidence} color="rgba(255,255,255,0.7)" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── AI Summary ── */}
          <motion.div
            variants={cardVariants}
            className="bg-card rounded-3xl p-5 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.1)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={15} style={{ color: "var(--coral)" }} />
              <h2 className="font-serif text-base font-semibold">AI Summary</h2>
            </div>
            {summaryLoading && !aiSummary ? (
              <div className="flex items-center gap-2 py-1">
                <div className="w-4 h-4 rounded-full border-2 border-[var(--coral)] border-t-transparent animate-spin" />
                <p className="text-sm text-muted-foreground">Generating summary…</p>
              </div>
            ) : summaryError ? (
              <p className="text-sm text-red-500">
                {summaryError} Showing basic data below instead.
              </p>
            ) : (
              <p className="text-sm text-foreground/80 leading-relaxed">
                {aiSummary ?? twin.summary}
              </p>
            )}
          </motion.div>

          {/* ── Health Evolution Timeline ── */}
          <motion.div
            variants={cardVariants}
            className="bg-card rounded-3xl p-5 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.1)]"
          >
            <h2 className="font-serif text-base font-semibold mb-3">Health Evolution</h2>
            <EvolutionTimeline points={twin.timeline} />
          </motion.div>

          {/* ── Prediction ── */}
          <motion.div
            variants={cardVariants}
            className="bg-card rounded-3xl p-5 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.1)]"
          >
            <h2 className="font-serif text-base font-semibold mb-3">Health Prediction (30 days)</h2>
            {twin.prediction.predictedWeightKg30d === null ? (
              <p className="text-sm text-muted-foreground text-center py-3">
                Log at least 2 weight entries to unlock predictions.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-secondary rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">Predicted Weight</p>
                  <p className="font-serif text-xl font-semibold">
                    {twin.prediction.predictedWeightKg30d}kg
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendIcon trend={twin.prediction.obesityRiskDirection} />
                    <span className="text-[11px] text-muted-foreground">
                      {twin.prediction.weightTrendKgPerWeek! >= 0 ? "+" : ""}
                      {twin.prediction.weightTrendKgPerWeek}kg/wk
                    </span>
                  </div>
                </div>
                <div className="bg-secondary rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">Predicted Score</p>
                  <p className="font-serif text-xl font-semibold">
                    {twin.prediction.predictedHealthScore30d}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Confidence: {twin.prediction.confidence}%
                  </p>
                </div>
              </div>
            )}
            {predictionInsight && (
              <div className="mt-3 bg-secondary rounded-xl p-3 flex items-start gap-2">
                <Sparkles size={13} className="text-[var(--coral)] mt-0.5 shrink-0" />
                <p className="text-xs text-foreground/80 leading-relaxed">{predictionInsight}</p>
              </div>
            )}
          </motion.div>

          {/* ── Modules ── */}
          <div>
            <h2 className="font-serif text-lg font-semibold mb-3 px-1">Health Modules</h2>
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="space-y-2.5"
            >
              {twin.modules.map((m) => (
                <ModuleCard key={m.key} module={m} />
              ))}
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </PhoneShell>
  );
}
