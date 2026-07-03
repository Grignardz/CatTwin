/**
 * AI Veterinary Assistant — intent-based response engine.
 *
 * Takes a user question + the cat's full context (profile, Digital Twin
 * modules, raw logs) and returns a grounded response. This is a rule-based
 * intent classifier, not an external LLM — but responses are always backed
 * by the same computed data shown on the Digital Twin, so answers stay
 * consistent across the app instead of being independently hallucinated.
 */
import type { User, Cat } from "./auth";
import { computeDigitalTwin } from "./digitalTwin";

export interface AssistantReply {
  text: string;
  actions?: { label: string; to: string }[];
}

type Intent =
  | "feeding" | "weight" | "vet" | "vaccination" | "health_status"
  | "activity" | "sleep" | "hydration" | "medical" | "stress"
  | "greeting" | "twin" | "unknown";

const INTENT_KEYWORDS: Record<Intent, string[]> = {
  feeding:      ["feed", "food", "eat", "meal", "diet", "portion", "hungry", "nutrition"],
  weight:       ["weight", "overweight", "underweight", "obese", "fat", "heavy", "thin", "bcs", "body condition"],
  vet:          ["vet visit", "appointment", "checkup", "check up", "veterinarian"],
  vaccination:  ["vaccine", "vaccination", "shot", "immuniz"],
  health_status:["health status", "how is", "how's", "overall health", "doing okay", "healthy"],
  activity:     ["activity", "exercise", "play", "energy", "active", "lazy"],
  sleep:        ["sleep", "nap", "rest", "tired"],
  hydration:    ["water", "hydrat", "drink", "thirsty"],
  medical:      ["allerg", "disease", "condition", "medic", "symptom", "sick", "ill", "pain"],
  stress:       ["stress", "anxious", "anxiety", "scared", "nervous"],
  greeting:     ["hi", "hello", "hey", "good morning", "good evening"],
  twin:         ["digital twin", "score", "ai summary", "prediction"],
  unknown:      [],
};

function classify(question: string): Intent {
  const q = question.toLowerCase();
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS) as [Intent, string[]][]) {
    if (keywords.some((k) => q.includes(k))) return intent;
  }
  return "unknown";
}

export function generateReply(question: string, user: User | null, cat: Cat | null): AssistantReply {
  if (!cat) {
    return {
      text: "I don't have a cat profile to work with yet. Add a cat from the home page and I can give you personalised, data-backed answers.",
      actions: [{ label: "Add a cat", to: "/" }],
    };
  }

  const intent = classify(question);
  const twin = computeDigitalTwin(user, cat.id);
  const name = cat.name;

  const weightLogs = (user?.weightLogs ?? []).filter((l) => l.catId === cat.id);
  const sleepLogs   = (user?.sleepLogs ?? []).filter((l) => l.catId === cat.id);
  const meals       = (user?.meals ?? []).filter((m) => m.catId === cat.id);
  const vetRecords  = (user?.vetRecords ?? []).filter((r) => r.catId === cat.id);

  const moduleFor = (key: string) => twin.modules.find((m) => m.key === key);

  switch (intent) {
    case "greeting":
      return {
        text: `Hello! I'm here to help with ${name}'s health. ${twin.hasAnyData ? `Their overall health score is currently ${twin.overallScore}/100.` : "I don't have any health data logged yet — try asking about feeding, weight, or activity to get started."}`,
      };

    case "feeding": {
      const nutrition = moduleFor("nutrition")!;
      if (meals.length === 0) {
        return {
          text: `${name} doesn't have a feeding schedule set up yet. Cats generally do well with 2-3 smaller meals per day, portioned based on their target weight.`,
          actions: [{ label: "Set up Food Plan", to: "/feeding" }],
        };
      }
      return {
        text: `${name} has ${meals.length} meal${meals.length > 1 ? "s" : ""} scheduled. ${nutrition.explanation} ${nutrition.suggestion}`,
        actions: [{ label: "View Food Plan", to: "/feeding" }],
      };
    }

    case "weight": {
      const weightMod = moduleFor("weight")!;
      const bodyMod = moduleFor("body")!;
      if (weightLogs.length === 0) {
        return {
          text: `No weight logs yet for ${name}. Log a weight entry and I can assess whether they're in a healthy range${cat.targetWeightKg ? ` (target: ${cat.targetWeightKg}kg)` : ""}.`,
          actions: [{ label: "Log Weight", to: "/health" }],
        };
      }
      const latest = weightLogs.at(-1)!.weight;
      return {
        text: `${name}'s latest logged weight is ${latest}kg. ${weightMod.explanation} ${bodyMod.hasData ? bodyMod.explanation : ""} ${weightMod.suggestion}`,
        actions: [{ label: "View Analytics", to: "/analytics" }],
      };
    }

    case "vet": {
      const dueSoon = vetRecords.filter((r) => r.status === "due_soon").sort((a, b) => a.date.localeCompare(b.date));
      if (dueSoon.length === 0) {
        return {
          text: vetRecords.length === 0
            ? `No vet records logged for ${name} yet. Add vaccination, deworming, or vet visit records to keep track.`
            : `${name} has no upcoming vet visits marked as due soon. All recorded items look up to date.`,
          actions: [{ label: "Vet & Reminders", to: "/health" }],
        };
      }
      const next = dueSoon[0];
      return {
        text: `${name}'s next due item is "${next.name}" on ${next.date}. ${dueSoon.length > 1 ? `There are ${dueSoon.length - 1} more items due soon too.` : ""}`,
        actions: [{ label: "View Schedule", to: "/health" }],
      };
    }

    case "vaccination": {
      const vaccMod = moduleFor("vaccination")!;
      if (!vaccMod.hasData) {
        return {
          text: `No vaccination records for ${name} yet. Add them in the Health section to track status.`,
          actions: [{ label: "Add Vaccination", to: "/health" }],
        };
      }
      return { text: vaccMod.explanation + " " + vaccMod.suggestion, actions: [{ label: "View Schedule", to: "/health" }] };
    }

    case "health_status": {
      return {
        text: twin.hasAnyData
          ? twin.summary
          : `${name} has just been added — no health data logged yet. Start recording weight, sleep, and activity to activate their AI health score.`,
        actions: [{ label: "Open Digital Twin", to: "/digital-twin" }],
      };
    }

    case "twin": {
      return {
        text: twin.hasAnyData
          ? `${twin.summary} Overall AI confidence is ${twin.overallConfidence}% based on how much data has been logged.`
          : `${name}'s Digital Twin is set up but has no data yet. Log weight, sleep, and meals to activate AI scoring.`,
        actions: [{ label: "Open Digital Twin", to: "/digital-twin" }],
      };
    }

    case "activity": {
      const activityMod = moduleFor("activity")!;
      if (!activityMod.hasData) {
        return {
          text: `No activity data for ${name} yet. Log their activity level during a health check-in.`,
          actions: [{ label: "Log Activity", to: "/health" }],
        };
      }
      return { text: `${activityMod.explanation} ${activityMod.suggestion}`, actions: [{ label: "View Health", to: "/health" }] };
    }

    case "sleep": {
      const sleepMod = moduleFor("sleep")!;
      if (!sleepMod.hasData) {
        return { text: `No sleep data logged for ${name} yet. Cats typically need 12-16 hours of sleep per day.`, actions: [{ label: "Log Sleep", to: "/health" }] };
      }
      return { text: `${sleepMod.explanation} ${sleepMod.suggestion}`, actions: [{ label: "View Health", to: "/health" }] };
    }

    case "hydration": {
      const hydrationMod = moduleFor("hydration")!;
      if (!hydrationMod.hasData) {
        return { text: `No hydration data for ${name} yet. Cats need roughly 50-60ml of water per kg of body weight daily.`, actions: [{ label: "Open Digital Twin", to: "/digital-twin" }] };
      }
      return { text: `${hydrationMod.explanation} ${hydrationMod.suggestion}`, actions: [{ label: "Open Digital Twin", to: "/digital-twin" }] };
    }

    case "medical": {
      const medicalMod = moduleFor("medical")!;
      const hasProfileConditions = cat.allergies || cat.existingDiseases;
      let text = "";
      if (hasProfileConditions) {
        text = `${name}'s profile notes: ${cat.allergies ? `allergies — ${cat.allergies}. ` : ""}${cat.existingDiseases ? `existing conditions — ${cat.existingDiseases}.` : ""}`;
      } else {
        text = `No allergies or existing conditions are recorded for ${name}.`;
      }
      if (medicalMod.hasData) text += ` ${medicalMod.suggestion}`;
      text += " For specific symptoms or urgent concerns, please consult a licensed veterinarian — I can't diagnose medical issues.";
      return { text, actions: [{ label: "View Profile", to: "/cat-profile" }] };
    }

    case "stress": {
      const stressMod = moduleFor("stress")!;
      if (!stressMod.hasData) {
        return { text: `Not enough logs yet to estimate ${name}'s stress levels — this is inferred from sleep and activity patterns over time.`, actions: [{ label: "Log Health Data", to: "/health" }] };
      }
      return { text: `${stressMod.explanation} ${stressMod.suggestion}`, actions: [{ label: "Open Digital Twin", to: "/digital-twin" }] };
    }

    default:
      return {
        text: `I'm not entirely sure how to answer that yet, but based on what's logged, ${name}'s overall health score is ${twin.hasAnyData ? `${twin.overallScore}/100` : "not yet available (no data logged)"}. Try asking about feeding, weight, activity, sleep, or vet visits — or check the Digital Twin for a full breakdown.`,
        actions: [{ label: "Open Digital Twin", to: "/digital-twin" }],
      };
  }
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
