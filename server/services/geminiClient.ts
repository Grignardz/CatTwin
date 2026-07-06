import { readFile } from "node:fs/promises";
import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import { z } from "zod";
import { config } from "../config";

const nullableMetric = z.number().nullable();
export const visionAnalysisSchema = z.object({
  is_cat: z.boolean(),
  bcs_score: z.number().int().min(1).max(9).nullable(),
  bcs_confidence: nullableMetric.refine((n) => n === null || (n >= 0 && n <= 1)),
  weight_estimate_kg: z.number().positive().max(40).nullable(),
  weight_confidence: nullableMetric.refine((n) => n === null || (n >= 0 && n <= 1)),
  obesity_risk_level: z.enum(["low", "moderate", "high"]).nullable(),
  coat_condition_score: z.number().int().min(0).max(100).nullable(),
  coat_condition_notes: z.string().max(200),
  recommendations: z.array(z.string().max(140)).max(4),
  overall_confidence: nullableMetric.refine((n) => n === null || (n >= 0 && n <= 1)),
}).superRefine((value, ctx) => {
  if (value.is_cat && [value.bcs_score, value.bcs_confidence, value.weight_estimate_kg, value.weight_confidence, value.obesity_risk_level, value.coat_condition_score, value.overall_confidence].some((v) => v === null)) {
    ctx.addIssue({ code: "custom", message: "Cat analyses require all metric fields." });
  }
});

export type VisionAnalysis = z.infer<typeof visionAnalysisSchema>;
export type VisionContext = { breed: string; age: string; lastWeightKg?: number; lastWeightDate?: string; lastManualBcs?: number };

const responseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    is_cat: { type: SchemaType.BOOLEAN },
    bcs_score: { type: SchemaType.INTEGER, nullable: true },
    bcs_confidence: { type: SchemaType.NUMBER, nullable: true },
    weight_estimate_kg: { type: SchemaType.NUMBER, nullable: true },
    weight_confidence: { type: SchemaType.NUMBER, nullable: true },
    obesity_risk_level: { type: SchemaType.STRING, format: "enum", enum: ["low", "moderate", "high"], nullable: true },
    coat_condition_score: { type: SchemaType.INTEGER, nullable: true },
    coat_condition_notes: { type: SchemaType.STRING },
    recommendations: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    overall_confidence: { type: SchemaType.NUMBER, nullable: true },
  },
  required: ["is_cat", "bcs_score", "bcs_confidence", "weight_estimate_kg", "weight_confidence", "obesity_risk_level", "coat_condition_score", "coat_condition_notes", "recommendations", "overall_confidence"],
};

export function parseVisionResponse(raw: string): VisionAnalysis {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return visionAnalysisSchema.parse(JSON.parse(cleaned));
}

class GeminiClient {
  private getClient() {
    if (!config.geminiApiKey) throw new Error("GEMINI_API_KEY is not configured");
    return new GoogleGenerativeAI(config.geminiApiKey);
  }

  async generateVisionAnalysis(imagePath: string, context: VisionContext): Promise<{ analysis: VisionAnalysis; raw: string }> {
    const image = await readFile(imagePath);
    const basePrompt = `You are a veterinary-informed visual health assessor for cats. Respond in JSON only.\nContext: breed=${context.breed}, age=${context.age}, last_logged_weight=${context.lastWeightKg ?? "unknown"}kg on ${context.lastWeightDate ?? "unknown"}, last_manual_bcs=${context.lastManualBcs ?? "unknown"}.\nRules: If the image does not clearly show a cat, set is_cat=false and null out numeric/risk fields. Base scores on visible evidence; use context only to sanity-check. Lower confidence for poor lighting, partial visibility, or blur. BCS is 1-9 (4-5 ideal). Keep coat notes <=200 chars and at most 4 recommendations <=140 chars each.`;
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const model = this.getClient().getGenerativeModel({ model: config.geminiModel, generationConfig: { temperature: 0.2, responseMimeType: "application/json", responseSchema } });
        const prompt = attempt === 0 ? basePrompt : `${basePrompt}\nIMPORTANT: The prior response was invalid. Return exactly one valid JSON object matching the schema and nothing else.`;
        const result = await Promise.race([
          model.generateContent([prompt, { inlineData: { data: image.toString("base64"), mimeType: "image/webp" } }]),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Gemini request timed out")), 30_000)),
        ]);
        const raw = result.response.text();
        return { analysis: parseVisionResponse(raw), raw };
      } catch (error) { lastError = error; }
    }
    throw lastError;
  }

  async generateChatResponse(systemPrompt: string, history: { role: string; content: string }[], userMessage: string) {
    const model = this.getClient().getGenerativeModel({ model: config.geminiModel, systemInstruction: systemPrompt, generationConfig: { temperature: 0.55 } });
    const chat = model.startChat({ history: history.slice(-20).map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })) });
    const result = await Promise.race([chat.sendMessage(userMessage), new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Gemini request timed out")), 30_000))]);
    return result.response.text();
  }

  async generateReportSummary(prompt: string) {
    const model = this.getClient().getGenerativeModel({ model: config.geminiModel, generationConfig: { temperature: 0.3 } });
    const result = await Promise.race([model.generateContent(prompt), new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Gemini request timed out")), 30_000))]);
    return result.response.text().trim();
  }
}

export const geminiClient = new GeminiClient();
