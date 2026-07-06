import "./config";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

const DEMO_USER_ID = "demo-user-cattwin";
const DEMO_CAT_ID = "demo-cat-labubu";

async function main() {
  const passwordHash = await bcrypt.hash("demo1234", 12);
  await prisma.user.upsert({
    where: { email: "demo@cattwin.local" },
    update: { name: "Demo User", passwordHash },
    create: {
      id: DEMO_USER_ID,
      email: "demo@cattwin.local",
      name: "Demo User",
      passwordHash,
      country: "India",
      preferences: JSON.stringify({ units: "kg", dateFormat: "DD/MM/YYYY", notifVet: true, notifWeight: true, notifFeeding: false, browserNotifications: false }),
    },
  });

  await prisma.cat.upsert({
    where: { id: DEMO_CAT_ID },
    update: { userId: DEMO_USER_ID },
    create: {
      id: DEMO_CAT_ID,
      userId: DEMO_USER_ID,
      name: "Labubu",
      breed: "British Shorthair",
      ageLabel: "3 years",
      birthDate: new Date("2023-04-12T00:00:00.000Z"),
      gender: "female",
      currentWeightKg: 4.4,
      targetWeightKg: 4.3,
      color: "Blue-grey",
      environment: "indoor",
      neutered: "yes",
    },
  });

  const weightSamples = [
    ["demo-weight-1", 4.2, "2026-04-04T08:00:00.000Z", "Morning weigh-in"],
    ["demo-weight-2", 4.3, "2026-05-04T08:00:00.000Z", null],
    ["demo-weight-3", 4.4, "2026-06-04T08:00:00.000Z", null],
    ["demo-weight-4", 4.4, "2026-07-03T08:00:00.000Z", "Before breakfast"],
  ] as const;
  for (const [id, weightKg, loggedAt, note] of weightSamples) {
    await prisma.weightLog.upsert({ where: { id }, update: { weightKg, loggedAt: new Date(loggedAt), note }, create: { id, catId: DEMO_CAT_ID, weightKg, loggedAt: new Date(loggedAt), note } });
  }

  const sleepSamples = [
    ["demo-sleep-1", 14, "moderate", 5, "2026-07-01T20:00:00.000Z"],
    ["demo-sleep-2", 13.5, "moderate", 5, "2026-07-02T20:00:00.000Z"],
    ["demo-sleep-3", 15, "light", 5, "2026-07-03T20:00:00.000Z"],
  ] as const;
  for (const [id, hoursSlept, activityLevel, manualBcs, loggedAt] of sleepSamples) {
    await prisma.sleepActivityLog.upsert({ where: { id }, update: { hoursSlept, activityLevel, manualBcs, loggedAt: new Date(loggedAt) }, create: { id, catId: DEMO_CAT_ID, hoursSlept, activityLevel, manualBcs, loggedAt: new Date(loggedAt) } });
  }

  const waterSamples = [["demo-water-1", 235, "2026-07-02T19:00:00.000Z"], ["demo-water-2", 250, "2026-07-03T19:00:00.000Z"]] as const;
  for (const [id, amountMl, loggedAt] of waterSamples) {
    await prisma.waterIntakeLog.upsert({ where: { id }, update: { amountMl, loggedAt: new Date(loggedAt) }, create: { id, catId: DEMO_CAT_ID, amountMl, loggedAt: new Date(loggedAt) } });
  }

  await prisma.foodPlan.upsert({
    where: { catId: DEMO_CAT_ID },
    update: { mealsPerDay: 2 },
    create: {
      id: "demo-food-plan",
      catId: DEMO_CAT_ID,
      mealsPerDay: 2,
      meals: {
        create: [
          { id: "demo-meal-1", time: "08:00", label: "Breakfast", foodName: "Wet food", brand: "Demo", portion: "85 g", reminderEnabled: true },
          { id: "demo-meal-2", time: "18:00", label: "Dinner", foodName: "Wet food", brand: "Demo", portion: "85 g", reminderEnabled: true },
        ],
      },
    },
  });

  await prisma.vetRecord.upsert({
    where: { id: "demo-vaccine-1" },
    update: {},
    create: { id: "demo-vaccine-1", catId: DEMO_CAT_ID, type: "vaccine", name: "FVRCP booster", givenAt: new Date("2025-08-10T09:00:00.000Z"), dueAt: new Date("2026-08-10T09:00:00.000Z"), status: "due_soon", note: "Annual booster" },
  });

  await prisma.healthScore.upsert({
    where: { id: "demo-health-score-1" },
    update: {},
    create: {
      id: "demo-health-score-1",
      catId: DEMO_CAT_ID,
      overallScore: 86,
      overallConfidence: 72,
      category: "good",
      moduleBreakdown: JSON.stringify({ body_condition: { score: 100, confidence: 76 }, weight_status: { score: 91, confidence: 70 }, nutrition: { score: 60, confidence: 46 }, hydration: { score: 93, confidence: 50 }, sleep: { score: 96, confidence: 60 }, activity: { score: 90, confidence: 60 }, stress: { score: 90, confidence: 55 }, vaccination_status: { score: 80, confidence: 70 }, medical_risk: { score: 100, confidence: 70 } }),
      summary: "Labubu's logged health indicators are stable. Body condition and sleep are strongest, while the upcoming vaccine booster needs attention.",
      timeline: JSON.stringify([{ label: "Apr 4", score: 81 }, { label: "May 4", score: 83 }, { label: "Jun 4", score: 85 }, { label: "Jul 3", score: 86 }]),
      computedAt: new Date("2026-07-03T20:05:00.000Z"),
    },
  });

  await prisma.prediction.upsert({
    where: { id: "demo-prediction-1" },
    update: {},
    create: { id: "demo-prediction-1", catId: DEMO_CAT_ID, horizonDays: 30, predictedWeightKg: 4.5, predictedScore: 84, confidence: 68, obesityDirection: "stable", weightTrend: 0.03, moduleForecasts: "{}", computedAt: new Date("2026-07-03T20:06:00.000Z") },
  });

  console.log("Seeded demo@cattwin.local / demo1234 with cat Labubu and sample health history.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
