import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Weight, CalendarClock, Activity, Heart, Clock,
  ChevronRight, TrendingUp, TrendingDown, Minus,
  ChevronLeft, X, Plus, PawPrint, Camera, Sparkles, Bell,
} from "lucide-react";
import { useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PhoneShell } from "@/components/PhoneShell";
import { useAuth } from "@/lib/auth";
import { computeNotifications } from "@/lib/notifications";
import catHero from "@/assets/cat-hero.jpg";
import { pageVariants, childVariants, cardVariants, staggerContainer, slideUpVariants, tapScale } from "@/lib/motion";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CatTwin AI — Your Cat's Health Companion" },
      { name: "description", content: "Track your cat's health, nutrition, and wellbeing with CatTwin AI." },
    ],
  }),
  component: Home,
});


function TrendIcon({ trend }: { trend: string }) {
  if (trend === "up")   return <TrendingUp size={12} className="text-emerald-500" />;
  if (trend === "down") return <TrendingDown size={12} className="text-red-400" />;
  return <Minus size={12} className="text-muted-foreground" />;
}

// ── Add-cat inline form ───────────────────────────────────────────────────────
function AddCatCard({ onAdd }: { onAdd: () => void }) {
  const { addCat } = useAuth();
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState("");
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Cat's name is required."); return; }
    setError("");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 400));
    addCat({ name: name.trim(), breed: breed.trim() || "Unknown breed", age: age.trim() || "Unknown", photo });
    setLoading(false);
    onAdd();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 350, damping: 28 }}
      className="bg-card rounded-3xl p-6 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.12)] border border-border/60"
    >
      <h3 className="font-serif text-xl font-semibold mb-1">Add your cat</h3>
      <p className="text-sm text-muted-foreground mb-5">You can add more cats later in Settings.</p>

      {error && (
        <p className="text-xs text-red-500 dark:text-red-400 mb-3">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Photo upload */}
        <div className="flex flex-col items-center mb-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative w-20 h-20 rounded-full bg-secondary border-2 border-dashed border-border hover:border-[var(--coral)] transition-colors flex items-center justify-center overflow-hidden group"
          >
            {photo ? (
              <img src={photo} alt="Cat photo" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-1">
                <Camera size={20} className="text-muted-foreground group-hover:text-[var(--coral)] transition-colors" />
                <span className="text-[9px] text-muted-foreground">Add photo</span>
              </div>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          {photo && (
            <button type="button" onClick={() => setPhoto(undefined)} className="text-xs text-muted-foreground mt-1.5 hover:text-red-500 transition-colors">
              Remove
            </button>
          )}
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Name <span className="text-[var(--coral)]">*</span>
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="mt-1.5 w-full bg-secondary rounded-xl px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--coral)] placeholder:text-muted-foreground/60"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Breed</label>
          <input
            value={breed}
            onChange={(e) => setBreed(e.target.value)}
            placeholder="Breed"
            className="mt-1.5 w-full bg-secondary rounded-xl px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--coral)] placeholder:text-muted-foreground/60"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Age</label>
          <input
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="Age"
            className="mt-1.5 w-full bg-secondary rounded-xl px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--coral)] placeholder:text-muted-foreground/60"
          />
        </div>
        <motion.button
          type="submit"
          disabled={loading}
          whileHover={{ scale: 1.01 }}
          whileTap={tapScale}
          className="w-full mt-2 flex items-center justify-center gap-2 bg-[var(--nav-dark)] hover:bg-[var(--coral)] disabled:opacity-60 text-white font-medium text-sm rounded-xl py-3.5 transition-colors"
        >
          {loading ? (
            <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          ) : (
            <><Plus size={15} /> Add Cat</>
          )}
        </motion.button>
      </form>
    </motion.div>
  );
}

// ── Empty state (no cats yet) ─────────────────────────────────────────────────
function EmptyState() {
  const [showForm, setShowForm] = useState(false);
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] ?? "there";

  // Get greeting based on time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  return (
    <div className="px-6 mt-4 pb-6">
      <AnimatePresence mode="wait">
        {!showForm ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="flex flex-col items-center text-center py-8"
          >
            <motion.h2
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="font-serif text-2xl font-semibold text-foreground mb-2"
            >
              Welcome to CatTwin
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="text-sm text-muted-foreground leading-relaxed max-w-[280px] mb-8"
            >
              Create your first Digital Twin to begin monitoring your cat's health with AI.
            </motion.p>

            <motion.button
              onClick={() => setShowForm(true)}
              whileHover={{ scale: 1.03 }}
              whileTap={tapScale}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="flex items-center gap-2 bg-[var(--nav-dark)] hover:bg-[var(--coral)] text-white font-medium text-sm rounded-2xl px-6 py-3.5 transition-colors"
            >
              <Plus size={16} />
              Create Digital Twin
            </motion.button>
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AddCatCard onAdd={() => setShowForm(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Home component ───────────────────────────────────────────────────────
function Home() {
  const { user } = useAuth();
  const cats = user?.cats ?? [];
  const hasCats = cats.length > 0;
  const [activeCatIdx, setActiveCatIdx] = useState(0);
  const activeCat = cats[Math.min(activeCatIdx, cats.length - 1)] ?? null;
  const catId = activeCat?.id ?? "";

  const unreadCount = useMemo(() => {
    if (!activeCat) return 0;
    const dismissed = user?.dismissedNotifications ?? [];
    return computeNotifications(user, activeCat).filter((n) => !dismissed.includes(n.id)).length;
  }, [activeCat, user]);

  // Real data for quick stats
  const weightLogs = (user?.weightLogs ?? []).filter((l) => l.catId === catId).sort((a,b) => a.date.localeCompare(b.date));
  const sleepLogs  = (user?.sleepLogs  ?? []).filter((l) => l.catId === catId).sort((a,b) => a.loggedAt.localeCompare(b.loggedAt));
  const meals      = (user?.meals      ?? []).filter((m) => m.catId === catId);
  const vetRecords = (user?.vetRecords ?? []).filter((r) => r.catId === catId);

  const latestWeight  = weightLogs.at(-1);
  const latestSleep   = sleepLogs.at(-1);
  const prevWeight    = weightLogs.at(-2);
  const weightChange  = latestWeight && prevWeight ? (latestWeight.weight - prevWeight.weight) : null;
  const nextVet       = vetRecords.filter((r) => r.status === "due_soon").sort((a,b) => a.date.localeCompare(b.date)).at(0);
  const lastLogTime   = [...weightLogs, ...sleepLogs].sort((a,b) => (a.loggedAt ?? "").localeCompare(b.loggedAt ?? "")).at(-1);

  function relativeTime(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  const quickStats = [
    { icon: Weight,        label: "Weight",       value: latestWeight ? `${latestWeight.weight} kg` : "—",  change: weightChange !== null ? `${weightChange >= 0 ? "+" : ""}${weightChange.toFixed(1)} kg` : "no data", trend: weightChange !== null ? (weightChange > 0 ? "up" : weightChange < 0 ? "down" : "neutral") : "neutral", to: "/health" },
    { icon: CalendarClock, label: "Next Vet",      value: nextVet ? nextVet.date.slice(5) : "—",             change: nextVet ? nextVet.name : "none set",    trend: "neutral" as const, to: "/health" },
    { icon: Activity,      label: "Activity",      value: latestSleep?.activity ?? "—",                      change: latestSleep ? latestSleep.date : "no data", trend: "neutral" as const, to: "/analytics" },
    { icon: Heart,         label: "Health Score",  value: (weightLogs.length > 0 || sleepLogs.length > 0) ? `${Math.min(100, weightLogs.length * 10 + sleepLogs.length * 10 + (meals.length > 0 ? 20 : 0))}` : "—", change: "score",  trend: "up" as const, to: "/analytics" },
    { icon: Clock,         label: "Last Log",      value: lastLogTime ? relativeTime(lastLogTime.loggedAt) : "—", change: "nothing",  trend: "neutral" as const, to: "/health" },
  ];

  const [scrollIdx, setScrollIdx] = useState(0);
  const canScrollLeft  = scrollIdx > 0;
  const canScrollRight = scrollIdx < quickStats.length - 3;

  return (
    <PhoneShell>
      <motion.div variants={pageVariants} initial="hidden" animate="visible" exit="exit">

        {/* Header */}
        <motion.div variants={childVariants} className="px-6 pt-12 pb-4 flex items-start justify-between">
          <div>
            <p className="text-2xl font-serif font-medium text-foreground leading-tight">Hello,</p>
            <h1 className="text-2xl font-serif font-semibold text-foreground leading-tight">
              {user?.name ?? "there"}!
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {hasCats ? "How are your pets today" : ""}
            </p>
          </div>

          {hasCats && (
            <div className="flex items-center gap-2 mt-1">
              {/* Notification bell with live unread count */}
              <motion.div whileHover={{ scale: 1.06 }} whileTap={tapScale} className="relative">
                <Link to="/notifications" className="w-9 h-9 rounded-full bg-card border border-border shadow-sm flex items-center justify-center" aria-label="Notifications">
                  <Bell size={15} className="text-foreground" />
                </Link>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[var(--coral)] text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </motion.div>

              {/* Cat selector — tap opens the cat's profile */}
              <motion.div whileHover={{ scale: 1.04 }} whileTap={tapScale}>
                <Link
                  to="/cat-profile"
                  search={{ catId: activeCat.id }}
                  className="flex items-center gap-2 bg-card rounded-full px-3 py-1.5 shadow-sm border border-border"
                >
                  <div className="w-6 h-6 rounded-full bg-[var(--coral-soft)] flex items-center justify-center overflow-hidden">
                    {activeCat.photo ? (
                      <img src={activeCat.photo} alt={activeCat.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-[var(--coral)]" style={{ color: "var(--coral)" }}>
                        {activeCat.name[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-medium">{activeCat.name}</span>
                  {cats.length > 1 && <ChevronRight size={12} className="text-muted-foreground" />}
                </Link>
              </motion.div>
            </div>
          )}
        </motion.div>

        {/* ── Empty state ── */}
        {!hasCats && <EmptyState />}

        {/* ── Has cats ── */}
        {hasCats && (
          <>
            {/* Quick Stats */}
            <motion.div variants={childVariants} className="px-6 mt-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-serif text-lg font-semibold">Quick Stats</h2>
                <div className="flex gap-1.5">
                  {[
                    { dir: "left",  canScroll: canScrollLeft,  fn: () => setScrollIdx(Math.max(0, scrollIdx - 1)) },
                    { dir: "right", canScroll: canScrollRight, fn: () => setScrollIdx(Math.min(quickStats.length - 3, scrollIdx + 1)) },
                  ].map(({ dir, canScroll, fn }) => (
                    <motion.button key={dir} onClick={fn} disabled={!canScroll} whileTap={canScroll ? tapScale : {}}
                      className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center disabled:opacity-30">
                      {dir === "left" ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                    </motion.button>
                  ))}
                </div>
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={scrollIdx}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  className="flex gap-3"
                >
                  {quickStats.slice(scrollIdx, scrollIdx + 3).map((stat) => (
                    <motion.div key={stat.label} whileHover={{ y: -3 }} whileTap={tapScale} className="flex-1 min-w-0">
                      <Link to={stat.to} className="block rounded-2xl bg-card p-3 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.1)]">
                        <motion.div
                          className="w-8 h-8 rounded-xl bg-[var(--coral-soft)] flex items-center justify-center mb-2"
                          whileHover={{ rotate: 8, scale: 1.1 }}
                          transition={{ type: "spring", stiffness: 400 }}
                        >
                          <stat.icon size={15} style={{ color: "var(--coral)" }} />
                        </motion.div>
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                        <p className="font-serif font-semibold text-sm mt-0.5">{stat.value}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <TrendIcon trend={stat.trend} />
                          <span className="text-xs text-muted-foreground">{stat.change}</span>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>
            </motion.div>

            {/* Pet Card */}
            <motion.div variants={cardVariants} className="px-6 mt-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-serif text-lg font-semibold">Your Pets</h2>
                {cats.length > 1 && (
                  <div className="flex gap-1">
                    {cats.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveCatIdx(i)}
                        className={`w-2 h-2 rounded-full transition-colors ${i === activeCatIdx ? "bg-[var(--coral)]" : "bg-border"}`}
                        aria-label={`Switch to cat ${i + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeCat.id}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  className="rounded-3xl overflow-hidden bg-card shadow-[0_8px_24px_-12px_rgba(0,0,0,0.15)]"
                >
                  {/* Cat avatar — tap to open AI Digital Twin */}
                  <Link
                    to="/digital-twin"
                    aria-label={`Open ${activeCat.name}'s AI Digital Twin`}
                    className="block bg-[var(--coral-soft)] h-48 flex items-center justify-center overflow-hidden relative"
                  >
                    {activeCat.photo ? (
                      <motion.img whileTap={tapScale} src={activeCat.photo} alt={activeCat.name} className="w-full h-full object-cover" />
                    ) : (
                      <motion.div
                        whileTap={tapScale}
                        animate={{ scale: [1, 1.04, 1] }}
                        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                        className="w-24 h-24 rounded-full bg-[var(--warm-yellow)]/50 flex items-center justify-center"
                      >
                        <PawPrint size={48} style={{ color: "var(--coral)" }} />
                      </motion.div>
                    )}
                  </Link>
                  <div className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-serif text-2xl font-semibold">{activeCat.name}</h3>
                        <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Sparkles size={11} className="text-[var(--coral)]" /> Your cat's twin
                        </p>
                      </div>
                      <Link
                        to="/cat-profile"
                        search={{ catId: activeCat.id }}
                        className="text-xs font-medium text-[var(--coral)] bg-[var(--coral-soft)] rounded-full px-3 py-1.5 mt-1 whitespace-nowrap"
                      >
                        View Profile
                      </Link>
                    </div>

                    <div className="flex gap-2 mt-4">
                      {[
                        { to: "/health",  label: "Log Weight", cls: "bg-secondary text-foreground" },
                        { to: "/feeding", label: "Log Food",   cls: "bg-secondary text-foreground" },
                        { to: "/chat",    label: "Chat",       cls: "bg-[var(--coral-soft)] text-foreground" },
                      ].map(({ to, label, cls }) => (
                        <motion.div key={to} whileTap={tapScale} className="flex-1">
                          <Link to={to} className={`block text-sm font-medium rounded-full py-2.5 text-center ${cls}`}>
                            {label}
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </motion.div>

            {/* Recent Activity — real data */}
            <motion.div variants={childVariants} className="px-6 mt-6 mb-4">
              <h2 className="font-serif text-lg font-semibold mb-3">Recent Activity</h2>
              <div className="bg-card rounded-2xl shadow-[0_4px_16px_-8px_rgba(0,0,0,0.08)] overflow-hidden">
                {weightLogs.length === 0 && sleepLogs.length === 0 && meals.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-sm text-muted-foreground">No activity yet. Start by logging a weight or meal.</p>
                    <motion.div whileTap={tapScale} className="inline-block mt-3">
                      <Link to="/health" className="text-xs font-medium text-[var(--coral)] underline underline-offset-2">Log first entry →</Link>
                    </motion.div>
                  </div>
                ) : (
                  (() => {
                    const items = [
                      ...weightLogs.slice(-3).map((l) => ({ time: relativeTime(l.loggedAt), type: "Weight logged", detail: `${l.weight} kg`, icon: Weight })),
                      ...sleepLogs.slice(-2).map((l) => ({ time: relativeTime(l.loggedAt), type: "Sleep logged", detail: `${l.hours}h · ${l.activity}`, icon: Activity })),
                      ...meals.slice(-2).map((m) => ({ time: relativeTime(m.createdAt), type: "Meal added", detail: `${m.food} ${m.amount}`, icon: Heart })),
                    ].sort((a, b) => a.time.localeCompare(b.time)).slice(0, 5);
                    return items.map((item, i) => (
                      <div key={i}>
                        <motion.div whileHover={{ backgroundColor: "var(--color-secondary)" }} transition={{ duration: 0.15 }}
                          className="flex items-center gap-3 px-4 py-3">
                          <div className="w-8 h-8 rounded-full bg-[var(--coral-soft)] flex items-center justify-center shrink-0">
                            <item.icon size={14} style={{ color: "var(--coral)" }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.type}</p>
                            <p className="text-xs text-muted-foreground">{item.detail}</p>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{item.time}</span>
                        </motion.div>
                        {i < items.length - 1 && <div className="h-px bg-border mx-4" />}
                      </div>
                    ));
                  })()
                )}
              </div>
            </motion.div>
          </>
        )}
      </motion.div>
    </PhoneShell>
  );
}

function StatRow({ label, value, pct, color }: { label: string; value: string; pct: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          style={{ background: color }}
        />
      </div>
    </div>
  );
}
