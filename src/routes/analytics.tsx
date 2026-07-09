import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Download,
  PawPrint,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Droplets,
  Moon,
  Activity as ActivityIcon,
  Sparkles,
  Syringe,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PhoneShell } from "@/components/PhoneShell";
import { useAuth } from "@/lib/auth";
import { computeDigitalTwin } from "@/lib/digitalTwin";
import { AnimatedBar, AreaChart, CircularProgress } from "@/components/charts";
import {
  pageVariants,
  childVariants,
  cardVariants,
  staggerContainer,
  tapScale,
} from "@/lib/motion";
import { downloadHealthReport } from "@/lib/reportGenerator";
import { useState } from "react";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Analytics — CatTwin AI" }] }),
  component: Analytics,
});

type Range = "week" | "month" | "year";
const RANGE_DAYS: Record<Range, number> = { week: 7, month: 30, year: 365 };

function filterByRange<T extends { date: string }>(logs: T[], range: Range): T[] {
  const cutoff = Date.now() - RANGE_DAYS[range] * 86_400_000;
  return logs.filter((l) => new Date(l.date).getTime() >= cutoff);
}

const ACTIVITY_LEVEL: Record<string, number> = { sedentary: 1, light: 2, moderate: 3, active: 4 };

function riskBadge(r: string) {
  if (r === "high") return "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300";
  if (r === "medium")
    return "bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-300";
  return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300";
}

function Analytics() {
  const { user } = useAuth();
  const cats = user?.cats ?? [];
  const activeCat = cats[0] ?? null;
  const catId = activeCat?.id ?? "";
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [range, setRange] = useState<Range>("month");

  // ── Raw logs (all-time, used by Digital Twin for scoring) ─────────────────
  const allWeightLogs = (user?.weightLogs ?? [])
    .filter((l) => l.catId === catId)
    .sort((a, b) => a.date.localeCompare(b.date));
  const allSleepLogs = (user?.sleepLogs ?? [])
    .filter((l) => l.catId === catId)
    .sort((a, b) => a.date.localeCompare(b.date));
  const allHydration = (user?.hydrationLogs ?? [])
    .filter((h) => h.catId === catId)
    .sort((a, b) => a.date.localeCompare(b.date));
  const meals = (user?.meals ?? []).filter((m) => m.catId === catId);
  const vetRecords = (user?.vetRecords ?? []).filter((r) => r.catId === catId);

  // ── Range-filtered logs (used only for the trend charts) ───────────────────
  const weightLogs = filterByRange(allWeightLogs, range);
  const sleepLogs = filterByRange(allSleepLogs, range);
  const hydration = filterByRange(allHydration, range);

  const hasEnoughData = allWeightLogs.length > 0 || allSleepLogs.length > 0;

  // ── AI Digital Twin (single source of truth for scoring) ───────────────────
  const twin = computeDigitalTwin(user, catId);
  const bodyMod = twin.modules.find((m) => m.key === "body")!;
  const activityMod = twin.modules.find((m) => m.key === "activity")!;

  const latestWeight = allWeightLogs.at(-1)?.weight ?? null;
  const avgSleep = allSleepLogs.length
    ? allSleepLogs.reduce((s, l) => s + l.hours, 0) / allSleepLogs.length
    : null;
  const latestBcs = allSleepLogs.at(-1)?.bcs ?? null;
  const latestActivity = allSleepLogs.at(-1)?.activity ?? null;

  // ── Risk alerts (derived straight from Digital Twin modules) ───────────────
  const alerts: { title: string; risk: string; desc: string }[] = [];
  if (latestBcs && latestBcs >= 7)
    alerts.push({
      title: "Obesity Risk",
      risk: "high",
      desc: `${activeCat?.name}'s BCS of ${latestBcs}/9 indicates obesity. Consider a vet visit.`,
    });
  if (latestBcs && latestBcs <= 2)
    alerts.push({
      title: "Underweight",
      risk: "high",
      desc: `${activeCat?.name}'s BCS of ${latestBcs}/9 suggests they may be underweight.`,
    });
  if (latestActivity === "sedentary")
    alerts.push({
      title: "Low Activity",
      risk: "medium",
      desc: `${activeCat?.name}'s activity level is sedentary. Try 2–3 short play sessions daily.`,
    });
  if (avgSleep && avgSleep < 10)
    alerts.push({
      title: "Low Sleep",
      risk: "low",
      desc: `Average ${avgSleep.toFixed(1)}h sleep is below the healthy 12–16h range for cats.`,
    });

  const vaccines = vetRecords.filter((r) => r.type === "vaccine");
  const vaccComplete = vaccines.filter((v) => v.status === "complete").length;
  const vaccDueSoon = vaccines.filter((v) => v.status === "due_soon").length;

  if (!activeCat)
    return (
      <PhoneShell>
        <div className="px-6 pt-12 pb-4 flex items-center gap-3">
          <Link
            to="/"
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="font-serif text-xl font-semibold flex-1 text-center pr-9">Analytics</h1>
        </div>
        <div className="px-6 py-16 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-[var(--coral-soft)] flex items-center justify-center mb-5">
            <PawPrint size={40} style={{ color: "var(--coral)" }} />
          </div>
          <h2 className="font-serif text-xl font-semibold mb-2">No cat added yet</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-[240px]">
            Add a cat and log data to see analytics.
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
          <h1 className="font-serif text-xl font-semibold flex-1 text-center pr-9">Analytics</h1>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="px-6 space-y-5 pb-6"
        >
          {/* Health Score */}
          <motion.div
            variants={cardVariants}
            className="bg-card rounded-3xl p-5 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.1)]"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-lg font-semibold">Health Score</h2>
              <Link
                to="/digital-twin"
                className="text-xs font-medium text-[var(--coral)] flex items-center gap-1"
              >
                <Sparkles size={11} /> AI Twin
              </Link>
            </div>
            {!hasEnoughData ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                Log weight and sleep data to generate a score.
              </div>
            ) : (
              <div className="flex items-center gap-5">
                <CircularProgress score={twin.overallScore} />
                <div className="flex-1 grid grid-cols-2 gap-2">
                  {[
                    {
                      label: "Weight",
                      val: latestWeight ? `${latestWeight}kg` : "—",
                      ok: bodyMod.hasData ? bodyMod.score >= 70 : null,
                    },
                    {
                      label: "Activity",
                      val: latestActivity ?? "—",
                      ok: activityMod.hasData ? activityMod.score >= 60 : null,
                    },
                    {
                      label: "Feeding",
                      val: meals.length ? `${meals.length} meals` : "—",
                      ok: meals.length > 0,
                    },
                    {
                      label: "Sleep",
                      val: avgSleep ? `${avgSleep.toFixed(1)}h` : "—",
                      ok: avgSleep ? avgSleep >= 12 && avgSleep <= 16 : null,
                    },
                  ].map((m) => (
                    <div key={m.label} className="bg-secondary rounded-xl p-2.5">
                      <div
                        className={`flex items-center gap-1 ${m.ok === true ? "text-emerald-500" : m.ok === false ? "text-red-400" : "text-muted-foreground"}`}
                      >
                        {m.ok === true ? (
                          <TrendingUp size={12} />
                        ) : m.ok === false ? (
                          <TrendingDown size={12} />
                        ) : (
                          <Minus size={12} />
                        )}
                        <span className="text-xs font-medium capitalize">{m.val}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{m.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* Range toggle */}
          <motion.div variants={childVariants} className="flex bg-secondary rounded-2xl p-1 gap-1">
            {(["week", "month", "year"] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium capitalize transition-all ${range === r ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
              >
                {r}
              </button>
            ))}
          </motion.div>

          {/* Weight Trend */}
          <motion.div
            variants={cardVariants}
            className="bg-card rounded-3xl p-5 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.1)]"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-serif text-lg font-semibold">Weight Trend</h2>
              {weightLogs.length > 0 && (
                <span className="text-xs text-muted-foreground">{weightLogs.length} entries</span>
              )}
            </div>
            <AreaChart
              data={weightLogs.map((l) => ({ label: l.date.slice(5), value: l.weight }))}
              color="var(--coral)"
              emptyLabel={`No weight entries in the last ${range}`}
            />
          </motion.div>

          {/* Sleep Trend */}
          <motion.div
            variants={cardVariants}
            className="bg-card rounded-3xl p-5 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.1)]"
          >
            <div className="flex items-center gap-2 mb-2">
              <Moon size={15} className="text-muted-foreground" />
              <h2 className="font-serif text-lg font-semibold">Sleep Trend</h2>
            </div>
            <AreaChart
              data={sleepLogs.map((l) => ({ label: l.date.slice(5), value: l.hours }))}
              color="#818cf8"
              emptyLabel={`No sleep entries in the last ${range}`}
            />
          </motion.div>

          {/* Activity Trend */}
          <motion.div
            variants={cardVariants}
            className="bg-card rounded-3xl p-5 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.1)]"
          >
            <div className="flex items-center gap-2 mb-2">
              <ActivityIcon size={15} className="text-muted-foreground" />
              <h2 className="font-serif text-lg font-semibold">Activity Trend</h2>
            </div>
            <AreaChart
              data={sleepLogs
                .filter((l) => l.activity)
                .map((l) => ({ label: l.date.slice(5), value: ACTIVITY_LEVEL[l.activity] ?? 0 }))}
              color="var(--warm-yellow)"
              emptyLabel={`No activity entries in the last ${range}`}
            />
          </motion.div>

          {/* Hydration Trend */}
          <motion.div
            variants={cardVariants}
            className="bg-card rounded-3xl p-5 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.1)]"
          >
            <div className="flex items-center gap-2 mb-2">
              <Droplets size={15} className="text-muted-foreground" />
              <h2 className="font-serif text-lg font-semibold">Hydration Trend</h2>
            </div>
            <AreaChart
              data={hydration.map((h) => ({ label: h.date.slice(5), value: h.ml }))}
              color="#38bdf8"
              emptyLabel={`No hydration entries in the last ${range}`}
            />
          </motion.div>

          {/* Vaccination Timeline summary */}
          <motion.div
            variants={cardVariants}
            className="bg-card rounded-3xl p-5 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.1)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <Syringe size={15} className="text-muted-foreground" />
              <h2 className="font-serif text-lg font-semibold">Vaccination Overview</h2>
            </div>
            {vaccines.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">
                No vaccination records yet.
              </p>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-secondary rounded-xl p-3 text-center">
                  <p className="font-serif text-2xl font-semibold text-emerald-500">
                    {vaccComplete}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Complete</p>
                </div>
                <div className="flex-1 bg-secondary rounded-xl p-3 text-center">
                  <p className="font-serif text-2xl font-semibold text-orange-500">{vaccDueSoon}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Due Soon</p>
                </div>
                <div className="flex-1 bg-secondary rounded-xl p-3 text-center">
                  <p className="font-serif text-2xl font-semibold text-muted-foreground">
                    {vaccines.length}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Total</p>
                </div>
              </div>
            )}
          </motion.div>

          {/* Risk Alerts */}
          <div>
            <motion.h2 variants={childVariants} className="font-serif text-lg font-semibold mb-3">
              Risk Alerts
            </motion.h2>
            <AnimatePresence>
              {alerts
                .filter((a) => !dismissed.includes(a.title))
                .map((alert, i) => (
                  <motion.div
                    key={alert.title}
                    initial={{ opacity: 0, y: 12, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 60, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 350, damping: 28, delay: i * 0.08 }}
                    className="bg-card rounded-2xl p-4 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.1)] mb-3"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={15} className="text-[var(--warm-yellow)]" />
                        <span className="text-sm font-semibold">{alert.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs rounded-full px-2 py-0.5 font-medium ${riskBadge(alert.risk)}`}
                        >
                          {alert.risk.charAt(0).toUpperCase() + alert.risk.slice(1)}
                        </span>
                        <motion.button
                          whileTap={{ scale: 0.8 }}
                          onClick={() => setDismissed((d) => [...d, alert.title])}
                          className="text-muted-foreground"
                        >
                          ✕
                        </motion.button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{alert.desc}</p>
                  </motion.div>
                ))}
              {alerts.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-card rounded-2xl p-4 text-center text-sm text-muted-foreground"
                >
                  {hasEnoughData ? "No risk alerts" : "Log data to get personalised alerts."}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Breed Comparison */}
          <motion.div
            variants={cardVariants}
            className="bg-card rounded-3xl p-5 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.1)]"
          >
            <h2 className="font-serif text-lg font-semibold mb-1">How {activeCat.name} Compares</h2>
            <p className="text-xs text-muted-foreground mb-4">
              vs. average {activeCat.breed || "domestic cat"}
            </p>
            {!hasEnoughData ? (
              <p className="text-sm text-muted-foreground text-center py-3">
                Log data to unlock breed comparison.
              </p>
            ) : (
              <div className="space-y-3">
                {[
                  {
                    label: "BCS (body condition)",
                    val: latestBcs ? `${latestBcs}/9` : "—",
                    pct: latestBcs ? (latestBcs / 9) * 100 : 0,
                    color: "var(--coral)",
                  },
                  {
                    label: "Avg sleep vs healthy",
                    val: avgSleep ? `${avgSleep.toFixed(1)}h` : "—",
                    pct: avgSleep ? Math.min((avgSleep / 14) * 100, 100) : 0,
                    color: "#818cf8",
                  },
                  {
                    label: "Health score",
                    val: hasEnoughData ? `${twin.overallScore}/100` : "—",
                    pct: twin.overallScore,
                    color: "var(--warm-yellow)",
                  },
                ].map((row) => (
                  <div key={row.label}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className="font-medium">{row.val}</span>
                    </div>
                    <AnimatedBar pct={row.pct} color={row.color} />
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Export */}
          <motion.button
            variants={childVariants}
            whileHover={{ scale: 1.02 }}
            whileTap={tapScale}
            disabled={!hasEnoughData}
            onClick={() => downloadHealthReport(user, activeCat)}
            className={`w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-medium transition-colors ${hasEnoughData ? "bg-[var(--nav-dark)] hover:bg-[var(--coral)] text-white" : "bg-[var(--nav-dark)] text-white/40 cursor-not-allowed"}`}
          >
            <Download size={16} /> Download Health Report (PDF)
          </motion.button>
          {!hasEnoughData && (
            <p className="text-center text-xs text-muted-foreground -mt-3">
              Available once you have logged data.
            </p>
          )}
          <Link
            to="/reports"
            className="block text-center text-xs font-medium text-[var(--coral)] underline underline-offset-2 -mt-1"
          >
            View full report options →
          </Link>
        </motion.div>
      </motion.div>
    </PhoneShell>
  );
}
