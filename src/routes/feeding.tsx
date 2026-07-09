import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bell,
  UtensilsCrossed,
  PawPrint,
  Plus,
  Trash2,
  Clock,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PhoneShell } from "@/components/PhoneShell";
import { useAuth, type Meal } from "@/lib/auth";
import {
  pageVariants,
  childVariants,
  cardVariants,
  staggerContainer,
  slideUpVariants,
  tapScale,
} from "@/lib/motion";

export const Route = createFileRoute("/feeding")({
  head: () => ({ meta: [{ title: "Food Plan — CatTwin AI" }] }),
  component: Feeding,
});

// ── Custom Time Picker ────────────────────────────────────────────────────────
function TimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);

  const parts = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  const initHr = parts ? parseInt(parts[1]) : 8;
  const initMin = parts ? parseInt(parts[2]) : 0;
  const initP = parts?.[3]?.toUpperCase() === "PM" ? "PM" : "AM";

  const [hour, setHour] = useState(initHr > 12 ? initHr - 12 : initHr || 12);
  const [minute, setMinute] = useState(initMin);
  const [period, setPeriod] = useState<"AM" | "PM">(initP);

  function commit(h: number, m: number, p: "AM" | "PM") {
    onChange(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${p}`);
  }

  function adj(type: "hour" | "min", dir: 1 | -1) {
    if (type === "hour") {
      const h = dir === 1 ? (hour >= 12 ? 1 : hour + 1) : hour <= 1 ? 12 : hour - 1;
      setHour(h);
      commit(h, minute, period);
    } else {
      const m = dir === 1 ? (minute >= 55 ? 0 : minute + 5) : minute <= 0 ? 55 : minute - 5;
      setMinute(m);
      commit(hour, m, period);
    }
  }

  function toggleP() {
    const p = period === "AM" ? "PM" : "AM";
    setPeriod(p);
    commit(hour, minute, p);
  }

  const displayValue = value || "Select time";

  return (
    <div className="relative mt-1">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between bg-secondary rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--coral)] text-left"
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>{displayValue}</span>
        <Clock size={14} className="text-muted-foreground" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Full-screen overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
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
                <p className="text-center text-xs text-muted-foreground uppercase tracking-wide mb-4">
                  Select Time
                </p>
                <div className="flex items-center justify-center gap-3">
                  {/* Hour column */}
                  <div className="flex flex-col items-center">
                    <button
                      type="button"
                      onClick={() => adj("hour", 1)}
                      className="w-14 h-10 rounded-xl bg-secondary flex items-center justify-center active:scale-90 transition-transform"
                    >
                      <ChevronUp size={18} className="text-foreground" />
                    </button>
                    <span className="font-serif text-4xl font-semibold my-3 w-14 text-center leading-none">
                      {hour.toString().padStart(2, "0")}
                    </span>
                    <button
                      type="button"
                      onClick={() => adj("hour", -1)}
                      className="w-14 h-10 rounded-xl bg-secondary flex items-center justify-center active:scale-90 transition-transform"
                    >
                      <ChevronDown size={18} className="text-foreground" />
                    </button>
                  </div>

                  <span className="font-serif text-3xl font-semibold text-muted-foreground">:</span>

                  {/* Minute column */}
                  <div className="flex flex-col items-center">
                    <button
                      type="button"
                      onClick={() => adj("min", 1)}
                      className="w-14 h-10 rounded-xl bg-secondary flex items-center justify-center active:scale-90 transition-transform"
                    >
                      <ChevronUp size={18} className="text-foreground" />
                    </button>
                    <span className="font-serif text-4xl font-semibold my-3 w-14 text-center leading-none">
                      {minute.toString().padStart(2, "0")}
                    </span>
                    <button
                      type="button"
                      onClick={() => adj("min", -1)}
                      className="w-14 h-10 rounded-xl bg-secondary flex items-center justify-center active:scale-90 transition-transform"
                    >
                      <ChevronDown size={18} className="text-foreground" />
                    </button>
                  </div>

                  {/* AM / PM toggle */}
                  <div className="flex flex-col gap-2 ml-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPeriod("AM");
                        commit(hour, minute, "AM");
                      }}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${period === "AM" ? "bg-[var(--coral)] text-white" : "bg-secondary text-muted-foreground"}`}
                    >
                      AM
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPeriod("PM");
                        commit(hour, minute, "PM");
                      }}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${period === "PM" ? "bg-[var(--coral)] text-white" : "bg-secondary text-muted-foreground"}`}
                    >
                      PM
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="mt-5 w-full bg-[var(--nav-dark)] text-white text-sm font-medium rounded-xl py-3 hover:bg-[var(--coral)] transition-colors active:scale-[0.97]"
                >
                  Done
                </button>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function MealCard({
  meal,
  onDelete,
  onToggleReminder,
}: {
  meal: Meal;
  onDelete: () => void;
  onToggleReminder: () => void;
}) {
  return (
    <motion.div
      variants={slideUpVariants}
      whileHover={{ y: -2 }}
      className="rounded-2xl bg-card p-4 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.1)]"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-foreground">{meal.time}</p>
          <p className="text-sm text-muted-foreground">{meal.label}</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={onDelete}
          className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 flex items-center justify-center"
        >
          <Trash2 size={13} />
        </motion.button>
      </div>
      <div className="mt-3 rounded-xl bg-secondary p-3 flex justify-between items-center">
        <div>
          <p className="text-xs text-muted-foreground">{meal.brand}</p>
          <p className="text-sm font-semibold">{meal.food}</p>
        </div>
        <span className="text-sm font-medium">{meal.amount}</span>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-foreground">
          <Bell size={14} /> Remind me before meal
        </div>
        <motion.button
          onClick={onToggleReminder}
          whileTap={{ scale: 0.9 }}
          className={`w-10 h-6 rounded-full transition-colors ${meal.reminder ? "bg-[var(--coral)]" : "bg-muted"}`}
          aria-label="Toggle reminder"
        >
          <motion.div
            layout
            transition={{ type: "spring", stiffness: 500, damping: 28 }}
            className={`w-5 h-5 bg-white rounded-full shadow ${meal.reminder ? "ml-[18px]" : "ml-0.5"}`}
          />
        </motion.button>
      </div>
    </motion.div>
  );
}

function Feeding() {
  const { user, addMeal, removeMeal, updateMeal } = useAuth();
  const cats = user?.cats ?? [];
  const activeCat = cats[0] ?? null;
  const catId = activeCat?.id ?? "";

  const meals = (user?.meals ?? []).filter((m) => m.catId === catId);

  const [showAdd, setShowAdd] = useState(false);
  const [newTime, setNewTime] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newFood, setNewFood] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [newAmount, setNewAmount] = useState("");

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newFood.trim()) return;
    addMeal(catId, {
      time: newTime,
      label: newLabel,
      food: newFood.trim(),
      brand: newBrand.trim() || "—",
      amount: newAmount.trim() || "—",
      reminder: false,
    });
    setNewFood("");
    setNewBrand("");
    setShowAdd(false);
  }

  if (!activeCat)
    return (
      <PhoneShell>
        <div className="px-6 pt-12 pb-4 flex items-center gap-3">
          <Link
            to="/"
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="font-serif text-xl font-semibold flex-1 text-center pr-9">Food Plan</h1>
        </div>
        <div className="px-6 py-16 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-[var(--coral-soft)] flex items-center justify-center mb-5">
            <PawPrint size={40} style={{ color: "var(--coral)" }} />
          </div>
          <h2 className="font-serif text-xl font-semibold mb-2">No cat added yet</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-[240px]">
            Add a cat from the home page first.
          </p>
          <Link
            to="/"
            className="bg-[var(--nav-dark)] text-white text-sm font-medium rounded-2xl px-5 py-3 hover:bg-[var(--coral)] transition-colors"
          >
            Go to Home
          </Link>
        </div>
      </PhoneShell>
    );

  return (
    <PhoneShell>
      <motion.div variants={pageVariants} initial="hidden" animate="visible" exit="exit">
        <motion.div variants={childVariants} className="px-6 pt-12 pb-4 flex items-center gap-3">
          <motion.div whileTap={tapScale}>
            <Link
              to="/"
              className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"
            >
              <ArrowLeft size={18} />
            </Link>
          </motion.div>
          <h1 className="font-serif text-xl font-semibold flex-1 text-center pr-9">Food Plan</h1>
        </motion.div>

        {/* Banner */}
        <motion.div variants={cardVariants} className="px-6">
          <motion.div
            whileHover={{ scale: 1.015 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="rounded-3xl bg-card border border-border p-6 text-center relative overflow-hidden shadow-[0_4px_16px_-8px_rgba(0,0,0,0.1)]"
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <motion.div
                animate={{ rotate: [0, 8, -8, 0] }}
                transition={{ repeat: Infinity, repeatDelay: 4, duration: 0.5 }}
              >
                <UtensilsCrossed size={16} style={{ color: "var(--coral)" }} />
              </motion.div>
              <span className="font-serif font-semibold">CatTwin</span>
            </div>
            <p className="font-serif text-2xl font-semibold">
              {meals.length === 0
                ? "No meals set"
                : `${meals.length} meal${meals.length > 1 ? "s" : ""} per day`}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {meals.length === 0 ? "Add your first meal below" : `For ${activeCat.name}`}
            </p>
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.35, 0.5, 0.35] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-[var(--coral)] blur-2xl pointer-events-none"
            />
          </motion.div>
        </motion.div>

        {/* Meal list */}
        <motion.div variants={childVariants} className="px-6 mt-6">
          <h2 className="font-serif text-lg font-semibold mb-3">Meal Times</h2>
          {meals.length === 0 ? (
            <div className="bg-card rounded-2xl p-6 text-center text-sm text-muted-foreground">
              No meals added yet. Tap below to add one.
            </div>
          ) : (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="space-y-3"
            >
              {meals.map((meal) => (
                <MealCard
                  key={meal.id}
                  meal={meal}
                  onDelete={() => removeMeal(meal.id)}
                  onToggleReminder={() => updateMeal(meal.id, { reminder: !meal.reminder })}
                />
              ))}
            </motion.div>
          )}

          {/* Add form */}
          <AnimatePresence>
            {showAdd ? (
              <motion.form
                key="form"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                onSubmit={handleAdd}
                className="mt-4 bg-card rounded-2xl p-4 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.1)] space-y-3"
              >
                <h3 className="font-serif text-base font-semibold">Add meal</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wide">
                      Time
                    </label>
                    <TimePicker value={newTime} onChange={setNewTime} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wide">
                      Label
                    </label>
                    <input
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      placeholder=""
                      className="mt-1 w-full bg-secondary rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--coral)]"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Food <span className="text-[var(--coral)]">*</span>
                  </label>
                  <input
                    value={newFood}
                    onChange={(e) => setNewFood(e.target.value)}
                    placeholder=""
                    autoFocus
                    className="mt-1 w-full bg-secondary rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--coral)]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wide">
                      Brand
                    </label>
                    <input
                      value={newBrand}
                      onChange={(e) => setNewBrand(e.target.value)}
                      placeholder=""
                      className="mt-1 w-full bg-secondary rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--coral)]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wide">
                      Amount
                    </label>
                    <input
                      value={newAmount}
                      onChange={(e) => setNewAmount(e.target.value)}
                      placeholder=""
                      className="mt-1 w-full bg-secondary rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--coral)]"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAdd(false)}
                    className="flex-1 bg-secondary text-foreground rounded-xl py-2.5 text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newFood.trim()}
                    className="flex-1 bg-[var(--nav-dark)] hover:bg-[var(--coral)] text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-50 transition-colors"
                  >
                    Add Meal
                  </button>
                </div>
              </motion.form>
            ) : (
              <motion.button
                key="btn"
                whileTap={tapScale}
                onClick={() => setShowAdd(true)}
                className="mt-4 w-full flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-2xl py-3 text-sm text-muted-foreground hover:border-[var(--coral)] hover:text-[var(--coral)] transition-colors"
              >
                <Plus size={16} /> Add Meal
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </PhoneShell>
  );
}
