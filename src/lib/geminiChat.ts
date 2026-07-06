/**
 * Gemini-powered veterinary chat assistant, called directly from the browser
 * via Firebase AI Logic. Replaces the old rule-based intent classifier.
 *
 * The cat's logged data (weight, sleep, meals, vet records, computed Digital
 * Twin scores) is summarized into a system instruction so Gemini's answers
 * stay grounded in what's actually been logged, instead of generic advice.
 */
import { getTextModel } from "./firebase";
import { computeDigitalTwin } from "./digitalTwin";
import type { User, Cat, ChatMessage } from "./auth";

export interface AssistantReply {
  text: string;
}

function buildSystemInstruction(user: User | null, cat: Cat | null): string {
  if (!cat) {
    return "You are CatTwin AI, a friendly veterinary assistant. No cat profile has been added yet — encourage the user to add one before giving personalized advice.";
  }

  const twin = computeDigitalTwin(user, cat.id);
  const weightLogs = (user?.weightLogs ?? []).filter((l) => l.catId === cat.id);
  const sleepLogs = (user?.sleepLogs ?? []).filter((l) => l.catId === cat.id);
  const meals = (user?.meals ?? []).filter((m) => m.catId === cat.id);
  const vetRecords = (user?.vetRecords ?? []).filter((r) => r.catId === cat.id);
  const hydrationLogs = (user?.hydrationLogs ?? []).filter((h) => h.catId === cat.id);

  const moduleLines = twin.modules
    .filter((m) => m.hasData)
    .map(
      (m) =>
        `- ${m.label}: ${m.score}/100 (${m.trend}, ${m.confidence}% confidence) — ${m.explanation}`,
    )
    .join("\n");

  const latestWeight = weightLogs.at(-1);
  const latestSleep = sleepLogs.at(-1);
  const dueSoon = vetRecords.filter((r) => r.status === "due_soon");

  return `You are CatTwin AI, a warm, knowledgeable veterinary assistant embedded in a cat health-tracking app. Answer the user's questions about their cat using ONLY the data below — don't invent numbers that aren't given. Keep replies concise (2-4 sentences), conversational, and specific to ${cat.name}. If asked something outside the logged data or requiring a real diagnosis, say so and recommend a licensed veterinarian. Never claim to diagnose medical conditions.

Cat profile:
- Name: ${cat.name}, Breed: ${cat.breed}, Age: ${cat.age}
${cat.targetWeightKg ? `- Target weight: ${cat.targetWeightKg}kg` : ""}
${cat.allergies ? `- Allergies: ${cat.allergies}` : ""}
${cat.existingDiseases ? `- Existing conditions: ${cat.existingDiseases}` : ""}

Overall health score: ${twin.hasAnyData ? `${twin.overallScore}/100 (${twin.overallConfidence}% confidence)` : "not enough data yet"}

Health modules with data:
${moduleLines || "(none logged yet)"}

Recent logs:
${latestWeight ? `- Latest weight: ${latestWeight.weight}kg on ${latestWeight.date}` : "- No weight logs yet"}
${latestSleep ? `- Latest sleep/activity: ${latestSleep.hours}h sleep, ${latestSleep.activity} activity, BCS ${latestSleep.bcs}/9` : "- No sleep/activity logs yet"}
- Meals scheduled: ${meals.length}
- Hydration logs: ${hydrationLogs.length}
${dueSoon.length > 0 ? `- Vet items due soon: ${dueSoon.map((r) => `${r.name} (${r.date})`).join(", ")}` : "- No vet items due soon"}`;
}

/**
 * Gemini's chat API requires history to strictly alternate user -> model ->
 * user -> model..., starting with "user". Our locally-stored history can
 * violate this in a couple of ways: a seeded greeting from the assistant
 * with no prior user turn, or a user question that never got a reply
 * because a previous request failed (its user message was still saved
 * locally, but no assistant message followed it). This collapses runs of
 * same-role messages down to the most recent one, then trims any leading
 * "model" turn or trailing unanswered "user" turn so the remaining history
 * is always valid to hand to startChat().
 */
function buildAlternatingHistory(history: ChatMessage[]) {
  const turns: { role: "user" | "model"; text: string }[] = [];
  for (const m of history) {
    if (!m.text?.trim()) continue;
    const role = m.role === "assistant" ? "model" : "user";
    if (turns.length > 0 && turns[turns.length - 1].role === role) {
      turns[turns.length - 1] = { role, text: m.text }; // keep the most recent of a same-role run
    } else {
      turns.push({ role, text: m.text });
    }
  }
  while (turns.length > 0 && turns[0].role === "model") turns.shift();
  while (turns.length > 0 && turns[turns.length - 1].role === "user") turns.pop();
  return turns.map((t) => ({ role: t.role, parts: [{ text: t.text }] }));
}

export async function generateReply(
  question: string,
  user: User | null,
  cat: Cat | null,
  history: ChatMessage[],
): Promise<AssistantReply> {
  const systemInstruction = buildSystemInstruction(user, cat);
  const model = getTextModel(systemInstruction);

  const chatHistory = buildAlternatingHistory(history.slice(-20));
  const chat = model.startChat({ history: chatHistory });

  const result = await Promise.race([
    chat.sendMessage(question),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Gemini request timed out")), 30_000),
    ),
  ]);

  return { text: result.response.text().trim() };
}

export const SUGGESTED_QUESTIONS = [
  "How much should I feed?",
  "Is my cat overweight?",
  "When's the next vet visit?",
  "What's my cat's health status?",
  "Activity recommendations?",
  "How's their hydration?",
  "Any stress signs?",
];
