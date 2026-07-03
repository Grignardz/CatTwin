/**
 * Themed date picker — replaces the native <input type="date"> calendar
 * with a popup that matches CatTwin's visual language (rounded cards,
 * coral accents, spring animations), mirroring the custom TimePicker
 * used on the Feeding page.
 *
 * Value/onChange use ISO date strings ("YYYY-MM-DD") to stay compatible
 * with the rest of the app's date handling.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function toIso(d: Date) {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
}
function parseIso(iso: string): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  maxDate,
  minDate,
  className,
}: {
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  maxDate?: Date;
  minDate?: Date;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = parseIso(value);
  const [viewMonth, setViewMonth] = useState(() => selected ?? new Date());

  const today = new Date();
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: { date: Date; outside: boolean }[] = [];
  for (let i = startOffset - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, daysInPrevMonth - i), outside: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), outside: false });
  }
  while (cells.length % 7 !== 0 || cells.length < 42) {
    const last = cells[cells.length - 1].date;
    cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), outside: true });
  }

  function isDisabled(d: Date) {
    if (maxDate && d > maxDate) return true;
    if (minDate && d < minDate) return true;
    return false;
  }

  function pick(d: Date) {
    if (isDisabled(d)) return;
    onChange(toIso(d));
    setOpen(false);
  }

  function shiftMonth(dir: 1 | -1) {
    setViewMonth(new Date(year, month + dir, 1));
  }

  const displayLabel = selected
    ? selected.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
    : placeholder;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setViewMonth(selected ?? new Date()); setOpen(true); }}
        className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--coral)] text-left ${className ?? "bg-secondary"}`}
      >
        <span className={selected ? "text-foreground" : "text-muted-foreground"}>{displayLabel}</span>
        <CalendarDays size={14} className="text-muted-foreground shrink-0" />
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
              className="bg-card border border-border rounded-3xl p-5 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.4)] w-full max-w-[320px]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Month nav */}
              <div className="flex items-center justify-between mb-4">
                <button type="button" onClick={() => shiftMonth(-1)}
                  className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center active:scale-90 transition-transform">
                  <ChevronLeft size={15} />
                </button>
                <span className="font-serif text-base font-semibold">
                  {viewMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                </span>
                <button type="button" onClick={() => shiftMonth(1)}
                  className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center active:scale-90 transition-transform">
                  <ChevronRight size={15} />
                </button>
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 mb-1">
                {WEEKDAYS.map((w) => (
                  <span key={w} className="text-[10px] text-muted-foreground text-center font-medium py-1">{w}</span>
                ))}
              </div>

              {/* Day grid */}
              <div className="grid grid-cols-7 gap-y-1">
                {cells.map(({ date, outside }, i) => {
                  const isSelected = selected && sameDay(date, selected);
                  const isToday = sameDay(date, today);
                  const disabled = isDisabled(date);
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={disabled}
                      onClick={() => pick(date)}
                      className={`relative mx-auto w-8 h-8 rounded-full text-xs font-medium flex items-center justify-center transition-all active:scale-90
                        ${isSelected ? "bg-[var(--coral)] text-white" : isToday ? "bg-[var(--coral-soft)] text-foreground" : "text-foreground hover:bg-secondary"}
                        ${outside ? "text-muted-foreground/40" : ""}
                        ${disabled ? "opacity-30 cursor-not-allowed hover:bg-transparent" : ""}
                      `}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2 mt-4">
                <button type="button" onClick={() => { onChange(""); setOpen(false); }}
                  className="flex-1 bg-secondary text-muted-foreground text-sm font-medium rounded-xl py-2.5 active:scale-95 transition-transform">
                  Clear
                </button>
                <button type="button" onClick={() => pick(today)}
                  disabled={isDisabled(today)}
                  className="flex-1 bg-[var(--nav-dark)] hover:bg-[var(--coral)] text-white text-sm font-medium rounded-xl py-2.5 transition-colors active:scale-95 disabled:opacity-40">
                  Today
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
