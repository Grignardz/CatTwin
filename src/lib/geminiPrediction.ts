/**
 * Gemini-powered health summary + prediction narrative for the Digital Twin
 * page, called directly from the browser via Firebase AI Logic.
 *
 * The underlying module SCORES (body condition, weight, sleep, etc.) and the
 * 30-day weight trend stay deterministic — they're computed locally in
 * digitalTwin.ts from the cat's actual logs, using plain statistics, so the
 * numbers on screen stay stable and reproducible. What Gemini generates here
 * is the natural-language summary and forward-looking insight built on top
 * of those numbers, replacing the old canned-template text.
 */
import { Schema } from "firebase/ai";
import { getJsonModel } from "./firebase";
import type { DigitalTwin } from "./digitalTwin";
import type { Cat } from "./auth";

export interface AiHealthNarrative {
  summary: string;
  predictionInsight: string | null;
}

// In-memory cache for the current tab session, keyed by cat + the numbers
// that actually feed the prompt. Revisiting the Digital Twin page (Home ->
// Digital Twin -> Home -> Digital Twin, etc.) without logging any new data
// reuses the last narrative instead of burning another Gemini call for
// text that would come out essentially the same anyway.
const narrativeCache = new Map<string, AiHealthNarrative>();

function cacheKey(cat: Cat, twin: DigitalTwin): string {
  return [
    cat.id,
    twin.overallScore,
    twin.overallConfidence,
    twin.prediction.predictedWeightKg30d,
    twin.prediction.predictedHealthScore30d,
  ].join("|");
}

const narrativeSchema = Schema.object({
  properties: {
    summary: Schema.string(),
    prediction_insight: Schema.string({ nullable: true }),
  },
});

export async function generateHealthNarrative(
  cat: Cat,
  twin: DigitalTwin,
): Promise<AiHealthNarrative> {
  if (!twin.hasAnyData) {
    return {
      summary: `${cat.name}'s Digital Twin is ready but has no data yet. Log weight, sleep, activity, and feeding to activate AI health scoring.`,
      predictionInsight: null,
    };
  }

  const key = cacheKey(cat, twin);
  const cached = narrativeCache.get(key);
  if (cached) return cached;

  const moduleLines = twin.modules
    .filter((m) => m.hasData)
    .map(
      (m) =>
        `- ${m.label}: ${m.score}/100 (trend: ${m.trend}, confidence: ${m.confidence}%) — ${m.explanation}`,
    )
    .join("\n");

  const predictionLine =
    twin.prediction.predictedWeightKg30d !== null
      ? `Weight trending ${twin.prediction.weightTrendKgPerWeek}kg/week, predicted weight in 30 days: ${twin.prediction.predictedWeightKg30d}kg, predicted health score: ${twin.prediction.predictedHealthScore30d}/100 (${twin.prediction.confidence}% confidence).`
      : "Not enough weight history yet for a 30-day prediction.";

  const prompt = `You are CatTwin AI, a veterinary-informed health assistant. Based ONLY on the data below for ${cat.name} (${cat.breed}, ${cat.age}), write:
1. "summary": a warm, concise 2-3 sentence overview of ${cat.name}'s current health (overall score ${twin.overallScore}/100, ${twin.overallConfidence}% confidence), naming the strongest and weakest module and one concrete suggestion. Do not invent data not given.
2. "prediction_insight": ONE sentence of forward-looking insight based on the 30-day prediction data, or null if there isn't enough data. Mention concretely what's driving the trend if relevant.

Health modules:
${moduleLines}

Prediction data: ${predictionLine}

Never diagnose medical conditions — recommend a vet for anything concerning.`;

  const model = getJsonModel(narrativeSchema);
  const result = await Promise.race([
    model.generateContent(prompt),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Gemini request timed out")), 30_000),
    ),
  ]);
  const raw = result.response.text();
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const parsed = JSON.parse(cleaned) as { summary: string; prediction_insight: string | null };
  const narrative: AiHealthNarrative = {
    summary: parsed.summary,
    predictionInsight: parsed.prediction_insight,
  };
  narrativeCache.set(key, narrative);
  return narrative;
}
