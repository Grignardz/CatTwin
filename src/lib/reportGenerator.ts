/**
 * AI Health Report generator.
 *
 * Builds a shareable PDF summarizing a cat's health, nutrition, activity,
 * sleep, vaccination/medical history, and AI-derived insights & recommendations.
 *
 * NOTE: "AI Insights" here are the same rule-based heuristics computed in
 * digitalTwin.ts — nothing here calls an external model. The report is a
 * formatted export of already-computed, honest data.
 */
import { jsPDF } from "jspdf";
import type { User, Cat } from "./auth";
import { computeDigitalTwin } from "./digitalTwin";

const CORAL = "#E8836B" as const;
const DARK = "#2B2320" as const;
const GRAY = "#6b6560" as const;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function generateHealthReportPdf(user: User | null, cat: Cat | null): jsPDF | null {
  if (!user || !cat) return null;

  const twin = computeDigitalTwin(user, cat.id);
  const weightLogs = (user.weightLogs ?? []).filter((l) => l.catId === cat.id).sort((a, b) => a.date.localeCompare(b.date));
  const sleepLogs = (user.sleepLogs ?? []).filter((l) => l.catId === cat.id).sort((a, b) => a.date.localeCompare(b.date));
  const hydrationLogs = (user.hydrationLogs ?? []).filter((h) => h.catId === cat.id).sort((a, b) => a.date.localeCompare(b.date));
  const meals = (user.meals ?? []).filter((m) => m.catId === cat.id);
  const vetRecords = (user.vetRecords ?? []).filter((r) => r.catId === cat.id);
  const vaccines = vetRecords.filter((r) => r.type === "vaccine");
  const dewormings = vetRecords.filter((r) => r.type === "deworming");
  const medical = vetRecords.filter((r) => r.type === "medical").sort((a, b) => b.date.localeCompare(a.date));

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 48;
  let y = 56;

  function heading(text: string) {
    if (y > 740) { doc.addPage(); y = 56; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(DARK);
    doc.text(text, marginX, y);
    y += 6;
    doc.setDrawColor(CORAL);
    doc.setLineWidth(1);
    doc.line(marginX, y, pageW - marginX, y);
    y += 18;
  }

  function bodyLine(text: string, opts: { bold?: boolean; color?: string; size?: number } = {}) {
    if (y > 780) { doc.addPage(); y = 56; }
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(opts.size ?? 10.5);
    doc.setTextColor(opts.color ?? GRAY);
    const lines = doc.splitTextToSize(text, pageW - marginX * 2);
    doc.text(lines, marginX, y);
    y += lines.length * 14 + 4;
  }

  function twoCol(label: string, value: string) {
    if (y > 780) { doc.addPage(); y = 56; }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(GRAY);
    doc.text(label, marginX, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(DARK);
    doc.text(value, marginX + 160, y);
    y += 16;
  }

  // ── Cover / Title ──────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(DARK);
  doc.text("CatTwin AI — Health Report", marginX, y);
  y += 22;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(GRAY);
  doc.text(`Generated ${new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}`, marginX, y);
  y += 28;

  // ── Cat profile ──────────────────────────────────────────────────────────
  heading("Cat Profile");
  twoCol("Name", cat.name || "—");
  twoCol("Breed", cat.breed || "—");
  twoCol("Age", cat.age || "—");
  if (cat.dob) twoCol("Date of Birth", cat.dob);
  if (cat.gender) twoCol("Gender", cat.gender);
  if (cat.weightKg) twoCol("Current Weight", `${cat.weightKg} kg`);
  if (cat.targetWeightKg) twoCol("Target Weight", `${cat.targetWeightKg} kg`);
  if (cat.color) twoCol("Color", cat.color);
  if (cat.environment) twoCol("Environment", cat.environment);
  if (cat.neutered) twoCol("Neutered", cat.neutered);
  if (cat.microchipId) twoCol("Microchip ID", cat.microchipId);
  y += 6;

  // ── Health Summary ───────────────────────────────────────────────────────
  heading("AI Health Summary");
  bodyLine(twin.summary, { color: DARK });
  twoCol("Overall Health Score", `${twin.overallScore}/100`);
  twoCol("AI Confidence", `${twin.overallConfidence}%`);
  y += 6;

  // ── Module scores ────────────────────────────────────────────────────────
  heading("Health Modules");
  twin.modules.forEach((m) => {
    if (!m.hasData) return;
    if (y > 760) { doc.addPage(); y = 56; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(DARK);
    doc.text(`${m.label}: ${m.score}/100 (${m.trend})`, marginX, y);
    y += 14;
    bodyLine(m.explanation);
    bodyLine(`Suggestion: ${m.suggestion}`, { color: CORAL });
    y += 2;
  });

  // ── Weight history ───────────────────────────────────────────────────────
  if (weightLogs.length > 0) {
    heading("Weight History");
    weightLogs.slice(-10).forEach((l) => twoCol(fmtDate(l.date), `${l.weight} kg${l.note ? ` — ${l.note}` : ""}`));
    y += 6;
  }

  // ── Nutrition / Feeding ──────────────────────────────────────────────────
  if (meals.length > 0) {
    heading("Nutrition & Feeding Schedule");
    meals.forEach((m) => twoCol(`${m.time} — ${m.label}`, `${m.food} (${m.amount})`));
    y += 6;
  }

  // ── Sleep & Activity ─────────────────────────────────────────────────────
  if (sleepLogs.length > 0) {
    heading("Sleep & Activity Log");
    sleepLogs.slice(-10).forEach((l) => twoCol(fmtDate(l.date), `${l.hours}h sleep, ${l.activity}, BCS ${l.bcs}/9`));
    y += 6;
  }

  // ── Hydration ─────────────────────────────────────────────────────────────
  if (hydrationLogs.length > 0) {
    heading("Hydration Log");
    hydrationLogs.slice(-10).forEach((h) => twoCol(fmtDate(h.date), `${h.ml} ml`));
    y += 6;
  }

  // ── Vaccination & Medical ────────────────────────────────────────────────
  if (vaccines.length > 0) {
    heading("Vaccination Records");
    vaccines.forEach((v) => twoCol(`${v.name} (${fmtDate(v.date)})`, v.status.replace("_", " ")));
    y += 6;
  }
  if (dewormings.length > 0) {
    heading("Deworming Records");
    dewormings.forEach((d) => twoCol(`${d.name} (${fmtDate(d.date)})`, d.status.replace("_", " ")));
    y += 6;
  }
  if (medical.length > 0) {
    heading("Medical History");
    medical.forEach((m) => {
      twoCol(fmtDate(m.date), m.name);
      if (m.note) bodyLine(m.note);
    });
    y += 6;
  }
  if (cat.allergies || cat.existingDiseases || cat.medicalNotes) {
    heading("Medical Notes");
    if (cat.allergies) bodyLine(`Allergies: ${cat.allergies}`);
    if (cat.existingDiseases) bodyLine(`Existing conditions: ${cat.existingDiseases}`);
    if (cat.medicalNotes) bodyLine(`Notes: ${cat.medicalNotes}`);
  }

  // ── Prediction ────────────────────────────────────────────────────────────
  if (twin.prediction.predictedWeightKg30d !== null) {
    heading("30-Day Prediction");
    twoCol("Predicted Weight", `${twin.prediction.predictedWeightKg30d} kg`);
    if (twin.prediction.predictedHealthScore30d !== null) twoCol("Predicted Health Score", `${twin.prediction.predictedHealthScore30d}/100`);
    twoCol("Prediction Confidence", `${twin.prediction.confidence}%`);
  }

  // ── Footer disclaimer ────────────────────────────────────────────────────
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(GRAY);
  const disclaimer = "This report is generated from self-logged data using rule-based health heuristics. It is not a substitute for professional veterinary diagnosis. Share with your veterinarian for a full clinical assessment.";
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    const lines = doc.splitTextToSize(disclaimer, pageW - marginX * 2);
    doc.text(lines, marginX, doc.internal.pageSize.getHeight() - 34);
    doc.text(`Page ${p} of ${pageCount}`, pageW - marginX - 60, doc.internal.pageSize.getHeight() - 34);
  }

  return doc;
}

export function downloadHealthReport(user: User | null, cat: Cat | null): boolean {
  const doc = generateHealthReportPdf(user, cat);
  if (!doc || !cat) return false;
  const filename = `CatTwin-Health-Report-${cat.name.replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
  return true;
}

/** Returns a Blob for the generated PDF, useful for sharing via the Web Share API. */
export function getHealthReportBlob(user: User | null, cat: Cat | null): Blob | null {
  const doc = generateHealthReportPdf(user, cat);
  if (!doc) return null;
  return doc.output("blob");
}
