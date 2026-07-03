import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Camera, Upload, RotateCcw, CheckCircle2 } from "lucide-react";
import { useState, useRef } from "react";
import { PhoneShell } from "@/components/PhoneShell";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/photo-analysis")({
  head: () => ({ meta: [{ title: "Photo Analysis — CatTwin AI" }] }),
  component: PhotoAnalysis,
});

type AnalysisResult = { weightRange: string; bcsMin: number; bcsMax: number; bcs: number; risk: "Low" | "Medium" | "High"; suggestion: string };

function riskColor(risk: string) {
  if (risk === "High") return "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300";
  if (risk === "Medium") return "bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-300";
  return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300";
}
function bcsBadge(score: number) {
  if (score <= 3) return { label: "Underweight", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" };
  if (score <= 5) return { label: "Ideal", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300" };
  if (score <= 6) return { label: "Overweight", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300" };
  return { label: "Obese", color: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300" };
}

// Simulated analysis — varies based on file size/name for a tiny bit of variety
function analyzeImage(file: File): AnalysisResult {
  const seed = file.size % 5;
  const bcs = 4 + seed % 3; // 4, 5, or 6
  const baseWeight = 3.2 + seed * 0.3;
  const risk: "Low"|"Medium"|"High" = bcs <= 5 ? "Low" : bcs === 6 ? "Medium" : "High";
  return {
    weightRange: `${baseWeight.toFixed(1)}–${(baseWeight + 0.6).toFixed(1)} kg`,
    bcsMin: bcs - 1, bcsMax: bcs + 1, bcs,
    risk,
    suggestion: bcs <= 5
      ? "Body condition looks healthy! Keep up the current feeding routine."
      : "Body condition may be slightly elevated. Consider adjusting portion sizes and increasing activity.",
  };
}

function PhotoAnalysis() {
  const { user, addWeightLog } = useAuth();
  const activeCat = (user?.cats ?? [])[0] ?? null;
  const catName = activeCat?.name ?? "your cat";

  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    const url = URL.createObjectURL(file);
    setPreview(url);
    setResult(null);
    setSaved(false);
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      setResult(analyzeImage(file));
    }, 2000);
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
    setPreview(null); setResult(null); setSaved(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleSave() {
    if (!result || !activeCat) return;
    // Save midpoint of estimated range as a weight log
    const mid = parseFloat(result.weightRange.split("–")[0]);
    addWeightLog(activeCat.id, mid, new Date().toISOString().split("T")[0], `Photo analysis estimate (BCS ${result.bcs}/9)`);
    setSaved(true);
  }

  const bcs = result ? bcsBadge(result.bcs) : null;

  return (
    <PhoneShell>
      <div className="px-6 pt-12 pb-4 flex items-center gap-3">
        <Link to="/chat" className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"><ArrowLeft size={18}/></Link>
        <h1 className="font-serif text-xl font-semibold flex-1 text-center pr-9">Photo Analysis</h1>
      </div>

      <div className="px-6 space-y-5 pb-6">
        {/* Upload card */}
        <div className="bg-card rounded-3xl p-5 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.1)]">
          <h2 className="font-serif text-lg font-semibold mb-1">Upload Photo</h2>
          <p className="text-xs text-muted-foreground mb-4">Upload a photo of {catName} for AI body condition analysis</p>

          {!preview ? (
            <div onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-[var(--coral)] hover:bg-[var(--coral-soft)]/30 transition-colors"
              role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}>
              <div className="w-14 h-14 rounded-full bg-[var(--coral-soft)] flex items-center justify-center">
                <Camera size={24} style={{ color: "var(--coral)" }}/>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Drag & drop or click to upload</p>
                <p className="text-xs text-muted-foreground mt-1">JPG, PNG, HEIC supported</p>
              </div>
              <button className="flex items-center gap-2 bg-[var(--nav-dark)] text-white text-sm rounded-full px-4 py-2 font-medium">
                <Upload size={14}/> Choose Photo
              </button>
            </div>
          ) : (
            <div className="relative">
              <img src={preview} alt="Uploaded" className="w-full h-56 object-cover rounded-2xl"/>
              <button onClick={reset} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-[var(--nav-dark)] text-white flex items-center justify-center">
                <RotateCcw size={14}/>
              </button>
            </div>
          )}

          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleInput}/>
        </div>

        {/* Analyzing */}
        {analyzing && (
          <div className="bg-card rounded-3xl p-5 flex flex-col items-center gap-3 py-8 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.1)]">
            <div className="w-10 h-10 rounded-full border-2 border-[var(--coral)] border-t-transparent animate-spin"/>
            <p className="text-sm font-medium">Analysing {catName}'s photo…</p>
            <p className="text-xs text-muted-foreground">Estimating body condition and weight range</p>
          </div>
        )}

        {/* Results */}
        {result && !analyzing && (
          <div className="bg-card rounded-3xl p-5 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom-2 duration-300">
            <h2 className="font-serif text-lg font-semibold mb-4">Analysis Results</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-secondary rounded-2xl p-3">
                <span className="text-sm text-muted-foreground">Estimated weight</span>
                <span className="font-serif text-xl font-semibold">{result.weightRange}</span>
              </div>
              <div className="flex items-center justify-between bg-secondary rounded-2xl p-3">
                <span className="text-sm text-muted-foreground">Body Condition Score</span>
                <div className="flex items-center gap-2">
                  <span className="font-serif text-xl font-semibold">{result.bcs}/9</span>
                  <span className={`text-xs rounded-full px-2 py-0.5 ${bcs?.color}`}>{bcs?.label}</span>
                </div>
              </div>
              <div className="flex items-center justify-between bg-secondary rounded-2xl p-3">
                <span className="text-sm text-muted-foreground">Obesity risk</span>
                <span className={`text-xs font-medium rounded-full px-3 py-1 ${riskColor(result.risk)}`}>{result.risk}</span>
              </div>
            </div>
            <div className="mt-4 bg-[var(--coral-soft)] rounded-2xl p-3">
              <p className="text-sm text-foreground/80 leading-relaxed">{result.suggestion}</p>
            </div>
            {!activeCat && <p className="mt-3 text-xs text-muted-foreground text-center">Add a cat to save results to their weight log.</p>}
            {activeCat && (
              <button onClick={handleSave} disabled={saved}
                className={`w-full mt-4 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-all active:scale-95 ${saved ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300" : "bg-[var(--nav-dark)] hover:bg-[var(--coral)] text-white"}`}>
                {saved ? <><CheckCircle2 size={16}/> Saved to {catName}'s Weight Log</> : `Save to ${catName}'s Weight Log`}
              </button>
            )}
          </div>
        )}
      </div>
    </PhoneShell>
  );
}
