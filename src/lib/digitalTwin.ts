/**
 * Digital Twin computation engine.
 *
 * Pure functions that turn a cat's raw logs (weight, sleep/activity/BCS,
 * meals, hydration, vet records) into the metrics shown on the AI Digital
 * Twin page: per-module scores, trends, AI explanations, suggestions,
 * an overall health score, a confidence score, a short evolution timeline,
 * a lightweight prediction, and a natural-language summary.
 *
 * NOTE: "AI" here means rule-based heuristics derived from logged data —
 * there is no external ML model. Confidence scores reflect how much data
 * backs each estimate, and language throughout should stay honest about
 * that (e.g. "estimated", "based on logs so far").
 */
import type { User, Cat } from "./auth";

export type Trend = "up" | "down" | "stable";

export interface TwinModule {
  key: string;
  label: string;
  score: number;          // 0-100, higher = healthier
  previousScore: number | null;
  trend: Trend;
  confidence: number;     // 0-100, how much data backs this score
  explanation: string;
  suggestion: string;
  hasData: boolean;
}

export interface TimelinePoint {
  label: string;   // e.g. "Jul 1"
  score: number;
}

export interface Prediction {
  weightTrendKgPerWeek: number | null;
  predictedWeightKg30d: number | null;
  predictedHealthScore30d: number | null;
  obesityRiskDirection: Trend;
  confidence: number;
}

export interface DigitalTwin {
  overallScore: number;
  overallConfidence: number;
  modules: TwinModule[];
  timeline: TimelinePoint[];
  prediction: Prediction;
  summary: string;
  hasAnyData: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function trendFromDelta(delta: number, deadband = 2): Trend {
  if (delta > deadband) return "up";
  if (delta < -deadband) return "down";
  return "stable";
}

function daysBetween(aIso: string, bIso: string): number {
  return Math.abs((new Date(aIso).getTime() - new Date(bIso).getTime()) / 86_400_000);
}

/** Splits a sorted-by-date array into "recent half" and "older half" for trend comparisons. */
function splitHalves<T>(arr: T[]): { recent: T[]; older: T[] } {
  const mid = Math.ceil(arr.length / 2);
  return { older: arr.slice(0, mid), recent: arr.slice(mid) };
}

// ── Main computation ─────────────────────────────────────────────────────────

export function computeDigitalTwin(user: User | null, catId: string): DigitalTwin {
  const cat = user?.cats.find((c) => c.id === catId) ?? null;

  const weightLogs = (user?.weightLogs ?? []).filter((l) => l.catId === catId).sort((a, b) => a.date.localeCompare(b.date));
  const sleepLogs  = (user?.sleepLogs  ?? []).filter((l) => l.catId === catId).sort((a, b) => a.date.localeCompare(b.date));
  const meals      = (user?.meals      ?? []).filter((m) => m.catId === catId);
  const hydration  = (user?.hydrationLogs ?? []).filter((h) => h.catId === catId).sort((a, b) => a.date.localeCompare(b.date));
  const vetRecords = (user?.vetRecords ?? []).filter((r) => r.catId === catId);

  const modules: TwinModule[] = [
    computeBodyCondition(sleepLogs),
    computeWeightStatus(weightLogs, cat),
    computeNutrition(meals),
    computeHydration(hydration, weightLogs, cat),
    computeSleep(sleepLogs),
    computeActivity(sleepLogs),
    computeStress(sleepLogs),
    computeVaccination(vetRecords),
    computeMedicalRisk(vetRecords, cat, sleepLogs),
  ];

  const hasAnyData = modules.some((m) => m.hasData);

  // Overall score = confidence-weighted average across modules that have data.
  const scored = modules.filter((m) => m.hasData);
  const totalConfidence = scored.reduce((s, m) => s + m.confidence, 0);
  const overallScore = totalConfidence > 0
    ? Math.round(scored.reduce((s, m) => s + m.score * m.confidence, 0) / totalConfidence)
    : 0;

  // Overall confidence = how many modules have data, weighted by their own confidence.
  const overallConfidence = Math.round(
    (modules.reduce((s, m) => s + (m.hasData ? m.confidence : 0), 0) / (modules.length * 100)) * 100
  );

  const timeline = computeTimeline(weightLogs, sleepLogs);
  const prediction = computePrediction(weightLogs, modules);
  const summary = computeSummary(cat, modules, overallScore, prediction);

  return { overallScore, overallConfidence, modules, timeline, prediction, summary, hasAnyData };
}

// ── Individual module computations ────────────────────────────────────────────

function computeBodyCondition(sleepLogs: User["sleepLogs"]): TwinModule {
  const withBcs = sleepLogs.filter((l) => typeof l.bcs === "number");
  if (withBcs.length === 0) {
    return { key: "body", label: "Body Condition", score: 0, previousScore: null, trend: "stable",
      confidence: 0, hasData: false,
      explanation: "No body condition score logged yet.",
      suggestion: "Log a body condition score (1-9 scale) during your next health check-in." };
  }
  const { recent, older } = splitHalves(withBcs);
  const scoreFromBcs = (bcs: number) => {
    // Ideal BCS is 4-5 on a 9-point scale. Score peaks there and falls off symmetrically.
    const distance = Math.min(Math.abs(bcs - 4), Math.abs(bcs - 5));
    return clamp(100 - distance * 16);
  };
  const currentBcs = withBcs.at(-1)!.bcs;
  const score = scoreFromBcs(currentBcs);
  const prevScore = older.length ? scoreFromBcs(avg(older.map((l) => l.bcs))!) : null;
  const trend = prevScore !== null ? trendFromDelta(score - prevScore) : "stable";
  const confidence = clamp(40 + withBcs.length * 12, 40, 95);

  let explanation: string;
  let suggestion: string;
  if (currentBcs >= 4 && currentBcs <= 5) {
    explanation = `Current BCS is ${currentBcs}/9 — within the ideal range.`;
    suggestion = "Maintain current feeding and activity routine.";
  } else if (currentBcs < 4) {
    explanation = `Current BCS is ${currentBcs}/9 — slightly underweight.`;
    suggestion = "Consider increasing meal portions slightly and monitor weight weekly.";
  } else {
    explanation = `Current BCS is ${currentBcs}/9 — above ideal range.`;
    suggestion = "Reduce treat frequency and increase daily play sessions.";
  }
  return { key: "body", label: "Body Condition", score, previousScore: prevScore, trend, confidence, hasData: true, explanation, suggestion };
}

function computeWeightStatus(weightLogs: User["weightLogs"], cat: Cat | null): TwinModule {
  if (weightLogs.length === 0) {
    return { key: "weight", label: "Weight Status", score: 0, previousScore: null, trend: "stable",
      confidence: 0, hasData: false,
      explanation: "No weight logs yet.",
      suggestion: "Log your cat's weight to start tracking this metric." };
  }
  const latest = weightLogs.at(-1)!.weight;
  const target = cat?.targetWeightKg ?? null;
  let score: number;
  let explanation: string;
  if (target) {
    const pctOff = Math.abs(latest - target) / target * 100;
    score = clamp(100 - pctOff * 4);
    explanation = `${latest}kg vs target ${target}kg (${pctOff.toFixed(1)}% off target).`;
  } else {
    // Without a target, judge by short-term stability only.
    score = 70;
    explanation = `Latest logged weight is ${latest}kg. Set a target weight in the cat profile for a precise score.`;
  }
  const { recent, older } = splitHalves(weightLogs);
  const recentAvg = avg(recent.map((l) => l.weight));
  const olderAvg = older.length ? avg(older.map((l) => l.weight)) : null;
  const trend: Trend = recentAvg !== null && olderAvg !== null
    ? trendFromDelta((recentAvg - olderAvg) * 20) // amplify small kg deltas into a visible trend
    : "stable";
  const prevScore = target && olderAvg ? clamp(100 - (Math.abs(olderAvg - target) / target * 100) * 4) : null;
  const confidence = clamp(30 + weightLogs.length * 10, 30, 95);
  const suggestion = target
    ? (latest > target ? "Slightly reduce daily calories and increase playtime." : latest < target ? "Slightly increase meal portions." : "Weight is on target — keep it up.")
    : "Add a target weight on the cat's profile to unlock precise weight-status scoring.";
  return { key: "weight", label: "Weight Status", score: Math.round(score), previousScore: prevScore, trend, confidence, hasData: true, explanation, suggestion };
}

function computeNutrition(meals: User["meals"]): TwinModule {
  if (meals.length === 0) {
    return { key: "nutrition", label: "Nutrition", score: 0, previousScore: null, trend: "stable",
      confidence: 0, hasData: false,
      explanation: "No meals logged yet.",
      suggestion: "Add a feeding schedule to start tracking nutrition." };
  }
  // Score rewards having a consistent multi-meal schedule (2-3 meals/day is ideal for cats).
  const mealCount = meals.length;
  const score = clamp(40 + mealCount * 10, 40, 95);
  const confidence = clamp(30 + mealCount * 8, 30, 90);
  return {
    key: "nutrition", label: "Nutrition", score, previousScore: null, trend: "stable", confidence, hasData: true,
    explanation: `${mealCount} meal${mealCount > 1 ? "s" : ""} configured in the feeding plan.`,
    suggestion: mealCount < 2 ? "Cats generally do well with 2-3 smaller meals per day." : "Feeding schedule looks well structured.",
  };
}

function computeHydration(hydration: User["hydrationLogs"], weightLogs: User["weightLogs"], cat: Cat | null): TwinModule {
  if (hydration.length === 0) {
    return { key: "hydration", label: "Hydration", score: 0, previousScore: null, trend: "stable",
      confidence: 0, hasData: false,
      explanation: "No water intake logged yet.",
      suggestion: "Log daily water intake to monitor hydration." };
  }
  const latestWeight = weightLogs.at(-1)?.weight ?? cat?.weightKg ?? 4;
  // Rule of thumb: cats need ~50-60ml/kg/day.
  const idealMl = latestWeight * 55;
  const recentMl = avg(hydration.slice(-3).map((h) => h.ml)) ?? 0;
  const pctOfIdeal = (recentMl / idealMl) * 100;
  const score = clamp(100 - Math.abs(100 - pctOfIdeal) * 0.8);
  const { recent, older } = splitHalves(hydration);
  const recentAvg = avg(recent.map((h) => h.ml));
  const olderAvg = older.length ? avg(older.map((h) => h.ml)) : null;
  const trend: Trend = recentAvg !== null && olderAvg !== null ? trendFromDelta(recentAvg - olderAvg, 20) : "stable";
  const confidence = clamp(30 + hydration.length * 10, 30, 90);
  return {
    key: "hydration", label: "Hydration", score: Math.round(score), previousScore: null, trend, confidence, hasData: true,
    explanation: `Averaging ~${Math.round(recentMl)}ml/day vs an estimated ${Math.round(idealMl)}ml ideal for ${latestWeight}kg.`,
    suggestion: pctOfIdeal < 80 ? "Consider adding a water fountain or wet food to boost intake." : "Hydration levels look healthy.",
  };
}

function computeSleep(sleepLogs: User["sleepLogs"]): TwinModule {
  if (sleepLogs.length === 0) {
    return { key: "sleep", label: "Sleep", score: 0, previousScore: null, trend: "stable",
      confidence: 0, hasData: false,
      explanation: "No sleep logs yet.",
      suggestion: "Log daily sleep hours to track this metric." };
  }
  const scoreFromHours = (h: number) => clamp(100 - Math.abs(h - 14) * 8); // ideal ~12-16h, midpoint 14
  const { recent, older } = splitHalves(sleepLogs);
  const recentAvg = avg(recent.map((l) => l.hours))!;
  const olderAvg = older.length ? avg(older.map((l) => l.hours)) : null;
  const score = Math.round(scoreFromHours(recentAvg));
  const prevScore = olderAvg !== null ? Math.round(scoreFromHours(olderAvg)) : null;
  const trend = prevScore !== null ? trendFromDelta(score - prevScore) : "stable";
  const confidence = clamp(30 + sleepLogs.length * 10, 30, 90);
  return {
    key: "sleep", label: "Sleep", score, previousScore: prevScore, trend, confidence, hasData: true,
    explanation: `Averaging ${recentAvg.toFixed(1)}h of sleep recently.`,
    suggestion: recentAvg < 11 ? "Sleep is below the healthy 12-16h range — check for stressors." : recentAvg > 18 ? "Unusually high sleep — worth a vet check if this persists." : "Sleep pattern looks healthy.",
  };
}

function computeActivity(sleepLogs: User["sleepLogs"]): TwinModule {
  const withActivity = sleepLogs.filter((l) => l.activity);
  if (withActivity.length === 0) {
    return { key: "activity", label: "Activity", score: 0, previousScore: null, trend: "stable",
      confidence: 0, hasData: false,
      explanation: "No activity level logged yet.",
      suggestion: "Log activity level during health check-ins." };
  }
  const levelScore: Record<string, number> = { sedentary: 30, light: 60, moderate: 90, active: 75 };
  const { recent, older } = splitHalves(withActivity);
  const score = Math.round(avg(recent.map((l) => levelScore[l.activity] ?? 50))!);
  const prevScore = older.length ? Math.round(avg(older.map((l) => levelScore[l.activity] ?? 50))!) : null;
  const trend = prevScore !== null ? trendFromDelta(score - prevScore) : "stable";
  const confidence = clamp(30 + withActivity.length * 10, 30, 90);
  const currentLevel = withActivity.at(-1)!.activity;
  return {
    key: "activity", label: "Activity", score, previousScore: prevScore, trend, confidence, hasData: true,
    explanation: `Most recent activity level: ${currentLevel}.`,
    suggestion: currentLevel === "sedentary" ? "Introduce 2-3 short play sessions daily." : currentLevel === "active" ? "Great activity level — ensure adequate rest too." : "Activity level is healthy.",
  };
}

function computeStress(sleepLogs: User["sleepLogs"]): TwinModule {
  // Proxy for stress: high variance in sleep hours + sedentary streaks suggest stress/anxiety.
  if (sleepLogs.length < 3) {
    return { key: "stress", label: "Stress", score: 0, previousScore: null, trend: "stable",
      confidence: 0, hasData: false,
      explanation: "Not enough logs yet to estimate stress levels.",
      suggestion: "Keep logging sleep and activity — stress is inferred from patterns over time." };
  }
  const hours = sleepLogs.map((l) => l.hours);
  const mean = avg(hours)!;
  const variance = avg(hours.map((h) => (h - mean) ** 2))!;
  const stdDev = Math.sqrt(variance);
  // Lower variance = more stable routine = lower stress. Score inverted from stdDev.
  const score = clamp(100 - stdDev * 15);
  const confidence = clamp(30 + sleepLogs.length * 8, 30, 85);
  return {
    key: "stress", label: "Stress", score: Math.round(score), previousScore: null, trend: "stable", confidence, hasData: true,
    explanation: `Sleep pattern variability is ${stdDev < 1.5 ? "low" : stdDev < 3 ? "moderate" : "high"} (estimated proxy for stress).`,
    suggestion: score < 60 ? "Irregular sleep can indicate stress — keep routines consistent and reduce environmental changes." : "Routine looks stable, low stress indicators.",
  };
}

function computeVaccination(vetRecords: User["vetRecords"]): TwinModule {
  const vaccines = vetRecords.filter((r) => r.type === "vaccine");
  if (vaccines.length === 0) {
    return { key: "vaccination", label: "Vaccination Status", score: 0, previousScore: null, trend: "stable",
      confidence: 0, hasData: false,
      explanation: "No vaccination records yet.",
      suggestion: "Add vaccination records in the Health section." };
  }
  const complete = vaccines.filter((v) => v.status === "complete").length;
  const dueSoon = vaccines.filter((v) => v.status === "due_soon").length;
  const score = clamp((complete / vaccines.length) * 100 - dueSoon * 10);
  const confidence = 90;
  return {
    key: "vaccination", label: "Vaccination Status", score: Math.round(score), previousScore: null, trend: "stable", confidence, hasData: true,
    explanation: `${complete}/${vaccines.length} vaccinations complete${dueSoon ? `, ${dueSoon} due soon` : ""}.`,
    suggestion: dueSoon > 0 ? "Schedule a vet visit for upcoming vaccinations." : "Vaccination schedule is up to date.",
  };
}

function computeMedicalRisk(vetRecords: User["vetRecords"], cat: Cat | null, sleepLogs: User["sleepLogs"]): TwinModule {
  const hasConditions = !!(cat?.existingDiseases || cat?.allergies);
  const overdueDeworm = vetRecords.filter((r) => r.type === "deworming" && r.status === "due_soon").length;
  const latestBcs = sleepLogs.at(-1)?.bcs;
  const bcsRisk = latestBcs ? (latestBcs >= 7 || latestBcs <= 2) : false;

  if (!hasConditions && overdueDeworm === 0 && !latestBcs) {
    return { key: "medical", label: "Medical Risk", score: 0, previousScore: null, trend: "stable",
      confidence: 0, hasData: false,
      explanation: "No medical risk indicators available yet.",
      suggestion: "Complete the cat's medical profile and log health data for risk assessment." };
  }

  let score = 90;
  const risks: string[] = [];
  if (hasConditions) { score -= 20; risks.push("existing condition on file"); }
  if (overdueDeworm > 0) { score -= 15; risks.push("overdue deworming"); }
  if (bcsRisk) { score -= 20; risks.push(`BCS of ${latestBcs}/9`); }
  score = clamp(score);

  return {
    key: "medical", label: "Medical Risk", score, previousScore: null, trend: "stable", confidence: 70, hasData: true,
    explanation: risks.length ? `Risk factors: ${risks.join(", ")}.` : "No active risk factors identified.",
    suggestion: score < 60 ? "Schedule a vet consultation to review risk factors." : "No immediate concerns — maintain regular check-ups.",
  };
}

// ── Timeline ──────────────────────────────────────────────────────────────────

function computeTimeline(weightLogs: User["weightLogs"], sleepLogs: User["sleepLogs"]): TimelinePoint[] {
  // Merge dates from both logs, compute a lightweight composite score per date.
  const dateSet = new Set<string>([...weightLogs.map((l) => l.date), ...sleepLogs.map((l) => l.date)]);
  const dates = Array.from(dateSet).sort();
  if (dates.length === 0) return [];

  return dates.slice(-10).map((date) => {
    const w = weightLogs.filter((l) => l.date === date).at(-1);
    const s = sleepLogs.filter((l) => l.date === date).at(-1);
    let score = 50;
    let count = 0;
    if (s?.bcs) {
      score += (100 - Math.min(Math.abs(s.bcs - 4), Math.abs(s.bcs - 5)) * 16 - 50);
      count++;
    }
    if (s?.hours) {
      score += (100 - Math.abs(s.hours - 14) * 8 - 50);
      count++;
    }
    const final = count > 0 ? clamp(50 + (score - 50) / Math.max(count, 1)) : 50;
    const d = new Date(date);
    return { label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), score: Math.round(final) };
  });
}

// ── Prediction ────────────────────────────────────────────────────────────────

function computePrediction(weightLogs: User["weightLogs"], modules: TwinModule[]): Prediction {
  if (weightLogs.length < 2) {
    return { weightTrendKgPerWeek: null, predictedWeightKg30d: null, predictedHealthScore30d: null, obesityRiskDirection: "stable", confidence: 0 };
  }
  const first = weightLogs[0];
  const last = weightLogs.at(-1)!;
  const daysSpan = Math.max(1, daysBetween(first.date, last.date));
  const totalDelta = last.weight - first.weight;
  const perWeek = (totalDelta / daysSpan) * 7;
  const predictedWeightKg30d = Math.round((last.weight + perWeek * (30 / 7)) * 10) / 10;

  const currentHealthAvg = avg(modules.filter((m) => m.hasData).map((m) => m.score)) ?? 0;
  const predictedHealthScore30d = clamp(Math.round(currentHealthAvg + (perWeek > 0.05 ? -5 : perWeek < -0.05 ? -3 : 2)));

  const obesityRiskDirection: Trend = perWeek > 0.05 ? "up" : perWeek < -0.05 ? "down" : "stable";
  const confidence = clamp(30 + weightLogs.length * 8, 30, 85);

  return {
    weightTrendKgPerWeek: Math.round(perWeek * 100) / 100,
    predictedWeightKg30d,
    predictedHealthScore30d,
    obesityRiskDirection,
    confidence,
  };
}

// ── Summary ───────────────────────────────────────────────────────────────────

function computeSummary(cat: Cat | null, modules: TwinModule[], overallScore: number, prediction: Prediction): string {
  const name = cat?.name ?? "Your cat";
  const scored = modules.filter((m) => m.hasData);
  if (scored.length === 0) {
    return `${name}'s Digital Twin is ready but has no data yet. Log weight, sleep, activity, and feeding to activate AI health scoring.`;
  }

  const weakest = [...scored].sort((a, b) => a.score - b.score)[0];
  const strongest = [...scored].sort((a, b) => b.score - a.score)[0];

  const tier = overallScore >= 80 ? "excellent" : overallScore >= 60 ? "good" : overallScore >= 40 ? "fair" : "needs attention";

  let trend = "";
  if (prediction.weightTrendKgPerWeek !== null) {
    if (prediction.obesityRiskDirection === "up") trend = " Weight has been trending upward — worth monitoring.";
    else if (prediction.obesityRiskDirection === "down") trend = " Weight has been trending downward — worth monitoring.";
  }

  return `${name}'s overall health is ${tier} (${overallScore}/100). ${strongest.label} is the strongest area, while ${weakest.label} could use attention: ${weakest.suggestion.toLowerCase()}${trend}`;
}
