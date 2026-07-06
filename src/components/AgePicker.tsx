/**
 * Themed age picker — replaces free-typing an age string with a popup
 * spinner (years + months), matching CatTwin's visual language and
 * mirroring the existing TimePicker (feeding.tsx) / DatePicker patterns.
 *
 * Value/onChange use a plain display string ("2 years", "6 months",
 * "1 year 3 months") to stay compatible with Cat.age (a free-text field).
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, ChevronDown, PawPrint } from "lucide-react";

function parseAge(value: string): { years: number; months: number } {
  const yMatch = value.match(/(\d+)\s*y/i);
  const mMatch = value.match(/(\d+)\s*m/i);
  return {
    years: yMatch ? parseInt(yMatch[1], 10) : 0,
    months: mMatch ? parseInt(mMatch[1], 10) : 0,
  };
}

function formatAge(years: number, months: number): string {
  if (years === 0 && months === 0) return "Under 1 month";
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years !== 1 ? "s" : ""}`);
  if (months > 0) parts.push(`${months} month${months !== 1 ? "s" : ""}`);
  return parts.join(" ");
}

export function AgePicker({
  value,
  onChange,
  placeholder = "Select age",
  className,
}: {
  value: string;
  onChange: (age: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const initial = parseAge(value);
  const [years, setYears] = useState(initial.years);
  const [months, setMonths] = useState(initial.months);

  function adjust(type: "years" | "months", dir: 1 | -1) {
    if (type === "years") {
      setYears((y) => Math.max(0, Math.min(30, y + dir)));
    } else {
      setMonths((m) => Math.max(0, Math.min(11, m + dir)));
    }
  }

  function openPicker() {
    const parsed = parseAge(value);
    setYears(parsed.years);
    setMonths(parsed.months);
    setOpen(true);
  }

  function confirm() {
    onChange(formatAge(years, months));
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={openPicker}
        className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--coral)] text-left ${className ?? "bg-secondary"}`}
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>{value || placeholder}</span>
        <PawPrint size={14} className="text-muted-foreground shrink-0" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 450, damping: 28 }}
              className="bg-card border border-border rounded-3xl p-6 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.4)] w-full max-w-[280px]"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-center text-xs text-muted-foreground uppercase tracking-wide mb-4">How old is your cat?</p>
              <div className="flex items-center justify-center gap-4">
                {/* Years column */}
                <div className="flex flex-col items-center">
                  <button type="button" onClick={() => adjust("years", 1)}
                    className="w-16 h-10 rounded-xl bg-secondary flex items-center justify-center active:scale-90 transition-transform">
                    <ChevronUp size={18} className="text-foreground" />
                  </button>
                  <span className="font-serif text-4xl font-semibold my-3 w-16 text-center leading-none">
                    {years}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">Years</span>
                  <button type="button" onClick={() => adjust("years", -1)}
                    className="w-16 h-10 rounded-xl bg-secondary flex items-center justify-center active:scale-90 transition-transform">
                    <ChevronDown size={18} className="text-foreground" />
                  </button>
                </div>

                {/* Months column */}
                <div className="flex flex-col items-center">
                  <button type="button" onClick={() => adjust("months", 1)}
                    className="w-16 h-10 rounded-xl bg-secondary flex items-center justify-center active:scale-90 transition-transform">
                    <ChevronUp size={18} className="text-foreground" />
                  </button>
                  <span className="font-serif text-4xl font-semibold my-3 w-16 text-center leading-none">
                    {months}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">Months</span>
                  <button type="button" onClick={() => adjust("months", -1)}
                    className="w-16 h-10 rounded-xl bg-secondary flex items-center justify-center active:scale-90 transition-transform">
                    <ChevronDown size={18} className="text-foreground" />
                  </button>
                </div>
              </div>

              <p className="text-center text-sm font-medium text-[var(--coral)] mt-3">{formatAge(years, months)}</p>

              <button type="button" onClick={confirm}
                className="mt-5 w-full bg-[var(--nav-dark)] text-white text-sm font-medium rounded-xl py-3 hover:bg-[var(--coral)] transition-colors active:scale-[0.97]">
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
