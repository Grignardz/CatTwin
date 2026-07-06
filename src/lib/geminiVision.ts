/**
 * Gemini-powered cat photo analysis (body condition, weight estimate, coat
 * condition), called directly from the browser via Firebase AI Logic.
 *
 * This replaces the old server/services/geminiClient.ts + routes/photoScans.ts.
 * No image ever leaves the device except straight to Google's Gemini API
 * through the Firebase AI Logic SDK — there is no CatTwin backend anymore.
 */
import { Schema } from "firebase/ai";
import { getJsonModel } from "./firebase";
import { dataUrlToInlineData } from "./imageUtils";

export interface VisionContext {
  breed: string;
  age: string;
  lastWeightKg?: number;
  lastWeightDate?: string;
  lastManualBcs?: number;
}

export interface VisionAnalysis {
  is_cat: boolean;
  bcs_score: number | null;
  bcs_confidence: number | null;
  weight_estimate_kg: number | null;
  weight_confidence: number | null;
  obesity_risk_level: "low" | "moderate" | "high" | null;
  coat_condition_score: number | null;
  coat_condition_notes: string;
  recommendations: string[];
  overall_confidence: number | null;
}

const visionSchema = Schema.object({
  properties: {
    is_cat: Schema.boolean(),
    bcs_score: Schema.integer({ nullable: true }),
    bcs_confidence: Schema.number({ nullable: true }),
    weight_estimate_kg: Schema.number({ nullable: true }),
    weight_confidence: Schema.number({ nullable: true }),
    obesity_risk_level: Schema.enumString({ nullable: true, enum: ["low", "moderate", "high"] }),
    coat_condition_score: Schema.integer({ nullable: true }),
    coat_condition_notes: Schema.string(),
    recommendations: Schema.array({ items: Schema.string() }),
    overall_confidence: Schema.number({ nullable: true }),
  },
});

function buildPrompt(context: VisionContext): string {
  return `You are a veterinary-informed visual health assessor for cats. Respond in JSON only.
Context: breed=${context.breed}, age=${context.age}, last_logged_weight=${context.lastWeightKg ?? "unknown"}kg on ${context.lastWeightDate ?? "unknown"}, last_manual_bcs=${context.lastManualBcs ?? "unknown"}.
Rules: If the image does not clearly show a cat, set is_cat=false and null out numeric/risk fields. Base scores on visible evidence; use context only to sanity-check. Lower confidence for poor lighting, partial visibility, or blur. BCS is 1-9 (4-5 ideal). Keep coat notes <=200 chars and at most 4 recommendations <=140 chars each.`;
}

function validate(analysis: VisionAnalysis) {
  if (analysis.is_cat) {
    const requiredFields = [
      analysis.bcs_score,
      analysis.bcs_confidence,
      analysis.weight_estimate_kg,
      analysis.weight_confidence,
      analysis.obesity_risk_level,
      analysis.coat_condition_score,
      analysis.overall_confidence,
    ];
    if (requiredFields.some((v) => v === null || v === undefined)) {
      throw new Error("Cat analyses require all metric fields.");
    }
  }
}

export async function analyzeCatPhoto(
  photoDataUrl: string,
  context: VisionContext,
): Promise<VisionAnalysis> {
  const model = getJsonModel(visionSchema);
  const { data, mimeType } = dataUrlToInlineData(photoDataUrl);
  const prompt = buildPrompt(context);

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const attemptPrompt =
        attempt === 0
          ? prompt
          : `${prompt}\nIMPORTANT: The prior response was invalid. Return exactly one valid JSON object matching the schema and nothing else.`;
      const result = await Promise.race([
        model.generateContent([attemptPrompt, { inlineData: { data, mimeType } }]),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Gemini request timed out")), 30_000),
        ),
      ]);
      const raw = result.response.text();
      const cleaned = raw
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "");
      const analysis = JSON.parse(cleaned) as VisionAnalysis;
      validate(analysis);
      return analysis;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Gemini analysis failed. Please try again.");
}

export function mapRiskLevel(level: string | null): "Low" | "Medium" | "High" | null {
  if (level === "moderate") return "Medium";
  if (level === "high") return "High";
  if (level === "low") return "Low";
  return null;
}
