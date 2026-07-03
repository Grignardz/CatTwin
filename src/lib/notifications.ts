/**
 * Notification computation engine.
 *
 * Derives a live list of reminders/alerts from real data — meals due soon,
 * vet items due soon, health risk flags (reusing the Digital Twin engine),
 * and a daily AI summary. Nothing here is a scheduled push notification;
 * this is a client-only app, so "notifications" means an in-app center
 * that recomputes on every load plus an optional native browser
 * Notification for feeding reminders while the tab stays open.
 */
import type { User, Cat } from "./auth";
import { computeDigitalTwin } from "./digitalTwin";

export type NotificationKind = "feeding" | "vaccination" | "deworming" | "vet" | "health" | "daily_summary";
export type NotificationSeverity = "info" | "warning" | "critical";

export interface AppNotification {
  id: string;         // stable id, used for dismissal persistence
  catId: string;
  kind: NotificationKind;
  severity: NotificationSeverity;
  title: string;
  body: string;
  actionLabel?: string;
  actionTo?: string;
  createdAt: string;   // ISO — used for sorting, not scheduling
}

function timeToMinutes(time: string): number | null {
  // Meal.time is stored as "HH:MM AM/PM" from the custom time picker.
  const m = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const period = m[3]?.toUpperCase();
  if (period === "PM" && h < 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h * 60 + min;
}

/** Builds the full, current notification list for one cat. Pure — call fresh whenever displaying. */
export function computeNotifications(user: User | null, cat: Cat | null): AppNotification[] {
  if (!user || !cat) return [];
  const notifications: AppNotification[] = [];
  const nowDate = new Date();
  const nowMinutes = nowDate.getHours() * 60 + nowDate.getMinutes();

  const meals = user.meals.filter((m) => m.catId === cat.id);
  const vetRecords = user.vetRecords.filter((r) => r.catId === cat.id);

  // ── Feeding reminders (meals with reminder=true, due within next 60 min) ──
  if (user.preferences.notifFeeding) {
    for (const meal of meals) {
      if (!meal.reminder) continue;
      const mealMinutes = timeToMinutes(meal.time);
      if (mealMinutes === null) continue;
      const diff = mealMinutes - nowMinutes;
      if (diff >= 0 && diff <= 60) {
        notifications.push({
          id: `feeding-${meal.id}-${nowDate.toISOString().split("T")[0]}`,
          catId: cat.id,
          kind: "feeding",
          severity: "info",
          title: `${meal.label} coming up`,
          body: `${cat.name}'s ${meal.label.toLowerCase()} (${meal.food}, ${meal.amount}) is scheduled at ${meal.time} — about ${diff} min from now.`,
          actionLabel: "View Food Plan",
          actionTo: "/feeding",
          createdAt: nowDate.toISOString(),
        });
      }
    }
  }

  // ── Vaccination / deworming due soon ───────────────────────────────────────
  if (user.preferences.notifVet) {
    for (const record of vetRecords) {
      if (record.status !== "due_soon") continue;
      const kind: NotificationKind = record.type === "vaccine" ? "vaccination" : record.type === "deworming" ? "deworming" : "vet";
      notifications.push({
        id: `vet-${record.id}`,
        catId: cat.id,
        kind,
        severity: "warning",
        title: record.type === "vaccine" ? "Vaccination due soon" : record.type === "deworming" ? "Deworming due soon" : "Vet follow-up due",
        body: `${cat.name}'s "${record.name}" is due around ${record.date}.`,
        actionLabel: "View Schedule",
        actionTo: "/health",
        createdAt: record.createdAt,
      });
    }
  }

  // ── Health risk alerts (reuse Digital Twin engine so numbers match Analytics) ──
  if (user.preferences.notifWeight) {
    const twin = computeDigitalTwin(user, cat.id);
    const bodyMod = twin.modules.find((m) => m.key === "body");
    const medicalMod = twin.modules.find((m) => m.key === "medical");

    if (bodyMod?.hasData && bodyMod.score < 50) {
      notifications.push({
        id: `health-body-${cat.id}`,
        catId: cat.id,
        kind: "health",
        severity: "critical",
        title: "Body condition needs attention",
        body: bodyMod.explanation + " " + bodyMod.suggestion,
        actionLabel: "Open Digital Twin",
        actionTo: "/digital-twin",
        createdAt: nowDate.toISOString(),
      });
    }
    if (medicalMod?.hasData && medicalMod.score < 60) {
      notifications.push({
        id: `health-medical-${cat.id}`,
        catId: cat.id,
        kind: "health",
        severity: "warning",
        title: "Medical risk flagged",
        body: medicalMod.explanation + " " + medicalMod.suggestion,
        actionLabel: "Open Digital Twin",
        actionTo: "/digital-twin",
        createdAt: nowDate.toISOString(),
      });
    }
  }

  // ── Daily AI summary (once per day, only if there's data to summarize) ────
  const twin = computeDigitalTwin(user, cat.id);
  if (twin.hasAnyData) {
    const today = nowDate.toISOString().split("T")[0];
    notifications.push({
      id: `daily-summary-${cat.id}-${today}`,
      catId: cat.id,
      kind: "daily_summary",
      severity: "info",
      title: "Daily AI Summary",
      body: twin.summary,
      actionLabel: "Open Digital Twin",
      actionTo: "/digital-twin",
      createdAt: nowDate.toISOString(),
    });
  }

  return notifications.sort((a, b) => {
    const order: Record<NotificationSeverity, number> = { critical: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });
}

/** Requests native browser notification permission. Returns the resulting permission state. */
export async function requestBrowserNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted" || Notification.permission === "denied") return Notification.permission;
  return Notification.requestPermission();
}

/** Fires a native browser notification if permission is granted. No-op otherwise. */
export function fireBrowserNotification(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  new Notification(title, { body, icon: "/favicon.ico" });
}
