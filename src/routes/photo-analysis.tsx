import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Camera,
  Upload,
  RotateCcw,
  CheckCircle2,
  Trash2,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { PhoneShell } from "@/components/PhoneShell";
import { useAuth } from "@/lib/auth";
import { analyzeCatPhoto, mapRiskLevel, type VisionContext } from "@/lib/geminiVision";
import { toFriendlyGeminiError } from "@/lib/geminiError";
import { prepareImageForAnalysis } from "@/lib/imageUtils";
import {
  savePhotoScan,
  listPhotoScans,
  deletePhotoScan,
  type StoredPhotoScan,
} from "@/lib/indexedDb";

export const Route = createFileRoute("/photo-analysis")({
  head: () => ({ meta: [{ title: "Photo Analysis — CatTwin AI" }] }),
  component: PhotoAnalysis,
});

// ── Types ──────────────────────────────────────────────────────────────────────

type ScanResult = StoredPhotoScan;

// ── Helpers ────────────────────────────────────────────────────────────────────

function riskColor(risk: string) {
  if (risk === "High") return "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300";
  if (risk === "Medium")
    return "bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-300";
  return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300";
}

function bcsBadge(score: number) {
  if (score <= 3)
    return {
      label: "Underweight",
      color: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
    };
  if (score <= 5)
    return {
      label: "Ideal",
      color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
    };
  if (score <= 6)
    return {
      label: "Overweight",
      color: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
    };
  return { label: "Obese", color: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300" };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Component ──────────────────────────────────────────────────────────────────

function PhotoAnalysis() {
  const { user, addWeightLog } = useAuth();
  const activeCat = (user?.cats ?? [])[0] ?? null;
  const catName = activeCat?.name ?? "your cat";

  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [history, setHistory] = useState<ScanResult[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // ── Fetch scan history (from on-device IndexedDB) ───────────────────────────

  const loadHistory = useCallback(async () => {
    if (!activeCat || !user) return;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const scans = await listPhotoScans(activeCat.id);
      setHistory(scans);
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : "Failed to load history.");
    } finally {
      setHistoryLoading(false);
    }
  }, [activeCat, user]);

  useEffect(() => {
    if (activeCat && user) {
      void loadHistory();
    }
  }, [loadHistory, activeCat, user]);

  // ── Upload & analyze (entirely on-device + direct Gemini call) ─────────────

  async function handleFile(file: File) {
    if (!activeCat || !user) {
      setAnalyzeError("Please add a cat profile before analysing a photo.");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    setSelectedFile(file);
    setResult(null);
    setSaved(false);
    setAnalyzeError(null);
    setAnalyzing(true);

    try {
      const { photoDataUrl, thumbnailDataUrl } = await prepareImageForAnalysis(file);

      const weightLogs = (user.weightLogs ?? [])
        .filter((l) => l.catId === activeCat.id)
        .sort((a, b) => a.date.localeCompare(b.date));
      const sleepLogs = (user.sleepLogs ?? [])
        .filter((l) => l.catId === activeCat.id)
        .sort((a, b) => a.date.localeCompare(b.date));
      const lastWeight = weightLogs.at(-1);
      const lastSleep = sleepLogs.at(-1);

      let age = activeCat.age || "unknown";
      if (activeCat.dob) {
        const months = Math.floor(
          (Date.now() - new Date(activeCat.dob).getTime()) / (1000 * 60 * 60 * 24 * 30.44),
        );
        age = months < 24 ? `${months} months` : `${Math.floor(months / 12)} years`;
      }

      const context: VisionContext = {
        breed: activeCat.breed || "unknown",
        age,
        lastWeightKg: lastWeight?.weight,
        lastWeightDate: lastWeight?.date,
        lastManualBcs: lastSleep?.bcs,
      };

      const analysis = await analyzeCatPhoto(photoDataUrl, context);

      if (!analysis.is_cat) {
        setAnalyzeError("No cat detected in the image. Please upload a clear photo of your cat.");
        setAnalyzing(false);
        return;
      }

      const now = new Date().toISOString();
      const scan: ScanResult = {
        id: crypto.randomUUID(),
        catId: activeCat.id,
        userId: user.id,
        photoDataUrl,
        thumbnailDataUrl,
        capturedAt: now,
        createdAt: now,
        status: "complete",
        errorMessage: null,
        bcsScore: analysis.bcs_score,
        bcsConfidence: analysis.bcs_confidence,
        weightEstimateKg: analysis.weight_estimate_kg,
        weightConfidence: analysis.weight_confidence,
        obesityRiskLevel: mapRiskLevel(analysis.obesity_risk_level),
        coatConditionScore: analysis.coat_condition_score,
        coatConditionNotes: analysis.coat_condition_notes,
        recommendations: analysis.recommendations,
        overallConfidence: analysis.overall_confidence,
      };

      await savePhotoScan(scan);
      setResult(scan);
      void loadHistory();
    } catch (err) {
      setAnalyzeError(toFriendlyGeminiError(err, "Analysis failed. Please try again."));
    } finally {
      setAnalyzing(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) handleFile(file);
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function reset() {
    setPreview(null);
    setSelectedFile(null);
    setResult(null);
    setSaved(false);
    setAnalyzeError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  // ── Save weight log (optional convenience) ───────────────────────────────────

  function handleSave() {
    if (!result || !activeCat || !result.weightEstimateKg) return;
    addWeightLog(
      activeCat.id,
      result.weightEstimateKg,
      new Date().toISOString().split("T")[0],
      `Photo analysis estimate (BCS ${result.bcsScore}/9)`,
    );
    setSaved(true);
  }

  // ── Delete scan ──────────────────────────────────────────────────────────────

  async function handleDelete(scanId: string) {
    setDeletingId(scanId);
    try {
      await deletePhotoScan(scanId);
      setHistory((prev) => prev.filter((s) => s.id !== scanId));
      if (result?.id === scanId) {
        reset();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete scan.");
    } finally {
      setDeletingId(null);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const bcs = result?.bcsScore != null ? bcsBadge(result.bcsScore) : null;
  const canSave = !!result?.weightEstimateKg && !!activeCat;

  return (
    <PhoneShell>
      <div className="px-6 pt-12 pb-4 flex items-center gap-3">
        <Link
          to="/chat"
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="font-serif text-xl font-semibold flex-1 text-center pr-9">Photo Analysis</h1>
      </div>

      <div className="px-6 space-y-5 pb-6">
        {/* No cat warning */}
        {!activeCat && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle size={18} className="text-orange-500 mt-0.5 shrink-0" />
            <p className="text-sm text-orange-700 dark:text-orange-300">
              Add a cat profile first to enable photo analysis.
            </p>
          </div>
        )}

        {/* Upload card */}
        <div className="bg-card rounded-3xl p-5 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.1)]">
          <h2 className="font-serif text-lg font-semibold mb-1">Upload Photo</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Upload a photo of {catName} for AI body condition analysis
          </p>

          {!preview ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => activeCat && inputRef.current?.click()}
              className={`border-2 border-dashed border-border rounded-2xl p-8 flex flex-col items-center gap-3 transition-colors ${activeCat ? "cursor-pointer hover:border-[var(--coral)] hover:bg-[var(--coral-soft)]/30" : "opacity-50 cursor-not-allowed"}`}
              role="button"
              tabIndex={activeCat ? 0 : -1}
              onKeyDown={(e) => e.key === "Enter" && activeCat && inputRef.current?.click()}
            >
              <div className="w-14 h-14 rounded-full bg-[var(--coral-soft)] flex items-center justify-center">
                <Camera size={24} style={{ color: "var(--coral)" }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Drag & drop or click to upload</p>
                <p className="text-xs text-muted-foreground mt-1">
                  JPG, PNG, HEIC supported · max 10 MB
                </p>
              </div>
              <button
                className="flex items-center gap-2 bg-[var(--nav-dark)] text-white text-sm rounded-full px-4 py-2 font-medium"
                disabled={!activeCat}
              >
                <Upload size={14} /> Choose Photo
              </button>
            </div>
          ) : (
            <div className="relative">
              <img src={preview} alt="Uploaded" className="w-full h-56 object-cover rounded-2xl" />
              <button
                onClick={reset}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-[var(--nav-dark)] text-white flex items-center justify-center"
              >
                <RotateCcw size={14} />
              </button>
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleInput}
          />
        </div>

        {/* Analysing spinner */}
        {analyzing && (
          <div className="bg-card rounded-3xl p-5 flex flex-col items-center gap-3 py-8 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.1)]">
            <div className="w-10 h-10 rounded-full border-2 border-[var(--coral)] border-t-transparent animate-spin" />
            <p className="text-sm font-medium">Analysing {catName}'s photo…</p>
          </div>
        )}

        {/* Error state */}
        {analyzeError && !analyzing && (
          <div className="bg-card rounded-3xl p-5 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-600 dark:text-red-400">
                  Analysis failed
                </p>
                <p className="text-xs text-muted-foreground mt-1">{analyzeError}</p>
              </div>
            </div>
            <button
              onClick={reset}
              className="w-full mt-4 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium bg-secondary hover:bg-secondary/80 transition-all active:scale-95"
            >
              <RotateCcw size={14} /> Try Again
            </button>
          </div>
        )}

        {/* Results card */}
        {result && !analyzing && !analyzeError && (
          <div className="bg-card rounded-3xl p-5 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-lg font-semibold">Analysis Results</h2>
              {result.overallConfidence != null && (
                <span className="text-xs text-muted-foreground bg-secondary rounded-full px-2 py-0.5">
                  {Math.round(result.overallConfidence * 100)}% confidence
                </span>
              )}
            </div>

            <div className="space-y-3">
              {/* Weight estimate */}
              {result.weightEstimateKg != null && (
                <div className="flex items-center justify-between bg-secondary rounded-2xl p-3">
                  <span className="text-sm text-muted-foreground">Estimated weight</span>
                  <div className="text-right">
                    <span className="font-serif text-xl font-semibold">
                      {result.weightEstimateKg.toFixed(1)} kg
                    </span>
                    {result.weightConfidence != null && (
                      <p className="text-xs text-muted-foreground">
                        {Math.round(result.weightConfidence * 100)}% confidence
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* BCS */}
              {result.bcsScore != null && (
                <div className="flex items-center justify-between bg-secondary rounded-2xl p-3">
                  <span className="text-sm text-muted-foreground">Body Condition Score</span>
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-xl font-semibold">{result.bcsScore}/9</span>
                    {bcs && (
                      <span className={`text-xs rounded-full px-2 py-0.5 ${bcs.color}`}>
                        {bcs.label}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Obesity risk */}
              {result.obesityRiskLevel && (
                <div className="flex items-center justify-between bg-secondary rounded-2xl p-3">
                  <span className="text-sm text-muted-foreground">Obesity risk</span>
                  <span
                    className={`text-xs font-medium rounded-full px-3 py-1 ${riskColor(result.obesityRiskLevel)}`}
                  >
                    {result.obesityRiskLevel}
                  </span>
                </div>
              )}

              {/* Coat condition */}
              {result.coatConditionScore != null && (
                <div className="flex items-center justify-between bg-secondary rounded-2xl p-3">
                  <span className="text-sm text-muted-foreground">Coat condition</span>
                  <span className="font-serif text-xl font-semibold">
                    {result.coatConditionScore}/100
                  </span>
                </div>
              )}
            </div>

            {/* Coat notes */}
            {result.coatConditionNotes && (
              <div className="mt-3 bg-[var(--coral-soft)] rounded-2xl p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Coat notes</p>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  {result.coatConditionNotes}
                </p>
              </div>
            )}

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Recommendations</p>
                {result.recommendations.map((rec, i) => (
                  <div key={i} className="bg-[var(--coral-soft)] rounded-2xl p-3">
                    <p className="text-sm text-foreground/80 leading-relaxed">{rec}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Save to weight log */}
            {!activeCat && (
              <p className="mt-3 text-xs text-muted-foreground text-center">
                Add a cat to save results to their weight log.
              </p>
            )}
            {canSave && (
              <button
                onClick={handleSave}
                disabled={saved}
                className={`w-full mt-4 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-all active:scale-95 ${saved ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300" : "bg-[var(--nav-dark)] hover:bg-[var(--coral)] text-white"}`}
              >
                {saved ? (
                  <>
                    <CheckCircle2 size={16} /> Saved to {catName}'s Weight Log
                  </>
                ) : (
                  `Save ${result.weightEstimateKg?.toFixed(1)} kg to ${catName}'s Weight Log`
                )}
              </button>
            )}
          </div>
        )}

        {/* Scan history */}
        {activeCat && (
          <div className="bg-card rounded-3xl p-5 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.1)]">
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-muted-foreground" />
                <h2 className="font-serif text-lg font-semibold">Scan History</h2>
                {history.length > 0 && (
                  <span className="text-xs bg-[var(--coral-soft)] text-[var(--coral)] rounded-full px-2 py-0.5 font-medium">
                    {history.length}
                  </span>
                )}
              </div>
              {showHistory ? (
                <ChevronUp size={16} className="text-muted-foreground" />
              ) : (
                <ChevronDown size={16} className="text-muted-foreground" />
              )}
            </button>

            {showHistory && (
              <div className="mt-4 space-y-3">
                {historyLoading && (
                  <div className="flex justify-center py-4">
                    <div className="w-6 h-6 rounded-full border-2 border-[var(--coral)] border-t-transparent animate-spin" />
                  </div>
                )}

                {historyError && !historyLoading && (
                  <p className="text-xs text-red-500 text-center">{historyError}</p>
                )}

                {!historyLoading && !historyError && history.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No scans yet. Upload your first photo above!
                  </p>
                )}

                {!historyLoading &&
                  history.map((scan) => {
                    const scanBcs = scan.bcsScore != null ? bcsBadge(scan.bcsScore) : null;
                    return (
                      <div
                        key={scan.id}
                        className="bg-secondary rounded-2xl p-3 flex gap-3 items-start"
                      >
                        {/* Thumbnail */}
                        <img
                          src={scan.thumbnailDataUrl}
                          alt="Scan thumbnail"
                          className="w-14 h-14 rounded-xl object-cover shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">
                            {formatDate(scan.capturedAt)}
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {scan.bcsScore != null && scanBcs && (
                              <span className={`text-xs rounded-full px-2 py-0.5 ${scanBcs.color}`}>
                                BCS {scan.bcsScore}/9 · {scanBcs.label}
                              </span>
                            )}
                            {scan.weightEstimateKg != null && (
                              <span className="text-xs bg-card rounded-full px-2 py-0.5 font-medium">
                                {scan.weightEstimateKg.toFixed(1)} kg
                              </span>
                            )}
                            {scan.obesityRiskLevel && (
                              <span
                                className={`text-xs rounded-full px-2 py-0.5 ${riskColor(scan.obesityRiskLevel)}`}
                              >
                                {scan.obesityRiskLevel} risk
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(scan.id)}
                          disabled={deletingId === scan.id}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0 mt-0.5"
                          aria-label="Delete scan"
                        >
                          {deletingId === scan.id ? (
                            <div className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" />
                          ) : (
                            <Trash2 size={13} />
                          )}
                        </button>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </div>
    </PhoneShell>
  );
}
