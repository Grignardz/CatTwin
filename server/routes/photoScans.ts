import { Router } from "express";
import multer from "multer";
import { prisma } from "../db";
import { imageStorage } from "../services/imageStorage";
import { geminiClient } from "../services/geminiClient";
import { config } from "../config";
import { asyncRoute, ApiError } from "../middleware/errors";
import type { VisionContext } from "../services/geminiClient";

export const photoScansRouter = Router();

// Memory storage — we pass the buffer straight to imageStorage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxImageBytes },
  fileFilter(_req, file, cb) {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed."));
    }
    cb(null, true);
  },
});

// ── Helpers ────────────────────────────────────────────────────────────────────

function mapRiskLevel(level: string | null): "Low" | "Medium" | "High" {
  if (level === "moderate") return "Medium";
  if (level === "high") return "High";
  return "Low";
}

function formatScanForClient(scan: {
  id: string;
  catId: string;
  userId: string;
  photoUrl: string;
  thumbnailUrl: string;
  capturedAt: Date;
  bcsScore: number | null;
  bcsConfidence: number | null;
  weightEstimateKg: number | null;
  weightConfidence: number | null;
  obesityRiskLevel: string | null;
  coatConditionScore: number | null;
  coatConditionNotes: string | null;
  recommendations: string;
  overallConfidence: number | null;
  status: string;
  errorMessage: string | null;
  createdAt: Date;
}) {
  let recommendations: string[] = [];
  try { recommendations = JSON.parse(scan.recommendations); } catch { /* ignore */ }

  return {
    id: scan.id,
    catId: scan.catId,
    userId: scan.userId,
    photoUrl: scan.photoUrl,
    thumbnailUrl: scan.thumbnailUrl,
    capturedAt: scan.capturedAt.toISOString(),
    createdAt: scan.createdAt.toISOString(),
    status: scan.status,
    errorMessage: scan.errorMessage,
    bcsScore: scan.bcsScore,
    bcsConfidence: scan.bcsConfidence,
    weightEstimateKg: scan.weightEstimateKg,
    weightConfidence: scan.weightConfidence,
    obesityRiskLevel: scan.obesityRiskLevel ? mapRiskLevel(scan.obesityRiskLevel) : null,
    coatConditionScore: scan.coatConditionScore,
    coatConditionNotes: scan.coatConditionNotes,
    recommendations,
    overallConfidence: scan.overallConfidence,
  };
}

// ── POST /api/photo-scans — upload + analyze ──────────────────────────────────

photoScansRouter.post(
  "/",
  upload.single("photo"),
  asyncRoute(async (req, res) => {
    const file = req.file;
    if (!file) throw new ApiError(400, "No image file provided.");

    // Accept catId and userId from multipart body fields (provided by the frontend)
    const catId = typeof req.body.catId === "string" ? req.body.catId.trim() : "";
    const userId = typeof req.body.userId === "string" ? req.body.userId.trim() : "";

    if (!catId) throw new ApiError(400, "catId is required.");
    if (!userId) throw new ApiError(400, "userId is required.");

    // Rate limit: max 5 scans per cat per hour
    const oneHourAgo = new Date(Date.now() - config.scanRateWindowMs);
    const recentCount = await prisma.photoScan.count({
      where: { catId, capturedAt: { gte: oneHourAgo } },
    });
    if (recentCount >= config.scanRateLimit) {
      throw new ApiError(429, `Rate limit reached: max ${config.scanRateLimit} scans per hour per cat.`);
    }

    // Save image first
    const stored = await imageStorage.save(file.buffer);

    // Create a pending scan record
    const scan = await prisma.photoScan.create({
      data: {
        catId,
        userId,
        photoUrl: stored.photoUrl,
        thumbnailUrl: stored.thumbnailUrl,
        status: "pending",
        recommendations: "[]",
      },
    });

    // Build context for Gemini — try to fetch cat from DB, fall back to defaults
    let visionContext: VisionContext = { breed: "unknown", age: "unknown" };
    try {
      const cat = await prisma.cat.findUnique({
        where: { id: catId },
        select: { breed: true, birthDate: true, ageLabel: true, weightLogs: { orderBy: { loggedAt: "desc" }, take: 1, select: { weightKg: true, loggedAt: true } }, sleepLogs: { orderBy: { loggedAt: "desc" }, take: 1, select: { manualBcs: true } } },
      });
      if (cat) {
        let age = cat.ageLabel ?? "unknown";
        if (cat.birthDate) {
          const months = Math.floor((Date.now() - cat.birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
          age = months < 24 ? `${months} months` : `${Math.floor(months / 12)} years`;
        }
        visionContext = {
          breed: cat.breed || "unknown",
          age,
          lastWeightKg: cat.weightLogs[0]?.weightKg ?? undefined,
          lastWeightDate: cat.weightLogs[0]?.loggedAt?.toISOString().split("T")[0] ?? undefined,
          lastManualBcs: cat.sleepLogs[0]?.manualBcs ?? undefined,
        };
      }
    } catch {
      // Cat may not be in DB (frontend-only auth) — proceed with defaults
    }

    // Run Gemini analysis
    try {
      const { analysis, raw } = await geminiClient.generateVisionAnalysis(stored.absolutePhotoPath, visionContext);

      if (!analysis.is_cat) {
        // Not a cat — mark failed, clean up files
        await imageStorage.delete(stored.photoUrl, stored.thumbnailUrl);
        await prisma.photoScan.update({
          where: { id: scan.id },
          data: {
            status: "failed",
            errorMessage: "No cat detected in the image. Please upload a clear photo of your cat.",
          },
        });
        return res.status(422).json({
          error: "No cat detected in the image. Please upload a clear photo of your cat.",
          scanId: scan.id,
        });
      }

      // Persist results
      const updated = await prisma.photoScan.update({
        where: { id: scan.id },
        data: {
          status: "complete",
          bcsScore: analysis.bcs_score,
          bcsConfidence: analysis.bcs_confidence,
          weightEstimateKg: analysis.weight_estimate_kg,
          weightConfidence: analysis.weight_confidence,
          obesityRiskLevel: analysis.obesity_risk_level,
          coatConditionScore: analysis.coat_condition_score,
          coatConditionNotes: analysis.coat_condition_notes,
          recommendations: JSON.stringify(analysis.recommendations),
          overallConfidence: analysis.overall_confidence,
          rawModelResponse: raw,
        },
      });

      return res.status(201).json({ scan: formatScanForClient(updated) });
    } catch (err) {
      // Analysis failed — mark scan failed, clean up files
      const message = err instanceof Error ? err.message : "Analysis failed. Please try again.";
      await imageStorage.delete(stored.photoUrl, stored.thumbnailUrl);
      await prisma.photoScan.update({
        where: { id: scan.id },
        data: { status: "failed", errorMessage: message },
      });
      throw new ApiError(502, `Gemini analysis failed: ${message}`);
    }
  })
);

// ── GET /api/photo-scans/:catId — scan history ────────────────────────────────

photoScansRouter.get(
  "/:catId",
  asyncRoute(async (req, res) => {
    const { catId } = req.params;
    const catIdStr = Array.isArray(catId) ? catId[0] : catId;
    const rawUserId = req.query.userId;
    const userId = typeof rawUserId === "string" ? rawUserId.trim() : undefined;

    const where: { catId: string; userId?: string; status?: string } = { catId: catIdStr, status: "complete" };
    if (userId) where.userId = userId;

    const scans = await prisma.photoScan.findMany({
      where,
      orderBy: { capturedAt: "desc" },
      take: 20,
    });

    return res.json({ scans: scans.map(formatScanForClient) });
  })
);

// ── GET /api/photo-scans/scan/:scanId — single scan ──────────────────────────

photoScansRouter.get(
  "/scan/:scanId",
  asyncRoute(async (req, res) => {
    const { scanId } = req.params;
    const scanIdStr = Array.isArray(scanId) ? scanId[0] : scanId;
    const scan = await prisma.photoScan.findUnique({ where: { id: scanIdStr } });
    if (!scan) throw new ApiError(404, "Scan not found.");
    return res.json({ scan: formatScanForClient(scan) });
  })
);

// ── DELETE /api/photo-scans/scan/:scanId — delete scan ───────────────────────

photoScansRouter.delete(
  "/scan/:scanId",
  asyncRoute(async (req, res) => {
    const { scanId } = req.params;
    const scanIdStr2 = Array.isArray(scanId) ? scanId[0] : scanId;
    const rawUserId2 = req.query.userId;
    const userId = typeof rawUserId2 === "string" ? rawUserId2.trim() : undefined;

    const scan = await prisma.photoScan.findUnique({ where: { id: scanIdStr2 } });
    if (!scan) throw new ApiError(404, "Scan not found.");
    if (userId && scan.userId !== userId) throw new ApiError(403, "Not authorized to delete this scan.");

    // Delete files and DB record
    await imageStorage.delete(scan.photoUrl, scan.thumbnailUrl);
    await prisma.photoScan.delete({ where: { id: scanIdStr2 } });

    return res.json({ success: true });
  })
);
