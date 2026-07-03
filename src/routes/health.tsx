import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft, Plus, Minus, ChevronDown, ChevronUp,
  Syringe, Pill, Clock, CheckCircle2, AlertCircle, Circle,
  Bell, ToggleRight, ToggleLeft, PawPrint, Trash2, Droplets,
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PhoneShell } from "@/components/PhoneShell";
import { DatePicker } from "@/components/DatePicker";
import { useAuth, type VetRecord } from "@/lib/auth";
import { pageVariants, childVariants, cardVariants, staggerContainer, slideUpVariants, tapScale } from "@/lib/motion";

export const Route = createFileRoute("/health")({
  head: () => ({ meta: [{ title: "Health — CatTwin AI" }] }),
  component: Health,
});

function MiniLineChart({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return <div className="h-16 flex items-center justify-center rounded-xl bg-secondary"><p className="text-xs text-muted-foreground">Log at least 2 entries to see the trend</p></div>;
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 0.1;
  const w = 280, h = 80;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 10) - 5}`);
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="rounded-xl overflow-hidden">
      <defs><linearGradient id={`grad-${color.replace(/[^a-z0-9]/gi,"")}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.25"/><stop offset="100%" stopColor={color} stopOpacity="0.02"/></linearGradient></defs>
      <path d={`M ${pts[0]} L ${pts.join(" L ")} L ${w},${h} L 0,${h} Z`} fill={`url(#grad-${color.replace(/[^a-z0-9]/gi,"")})`}/>
      <path d={`M ${pts.join(" L ")}`} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={pts[pts.length-1].split(",")[0]} cy={pts[pts.length-1].split(",")[1]} r="4" fill={color}/>
    </svg>
  );
}

const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
function ActivityHeatmap({ data }: { data: number[] }) {
  const hasData = data.some((v) => v > 0);
  return (
    <div className="flex gap-1.5 mt-3">
      {days.map((d, i) => {
        const lvl = data[i] ?? 0;
        const opacity = hasData ? 0.1 + (lvl / 4) * 0.9 : 0.08;
        return (
          <div key={d} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full aspect-square rounded-lg" style={{ background: `oklch(0.82 0.09 35 / ${opacity})` }}/>
            <span className="text-[10px] text-muted-foreground">{d}</span>
          </div>
        );
      })}
    </div>
  );
}

function bcsBadge(score: number) {
  if (score <= 3) return { label: "Underweight", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" };
  if (score <= 5) return { label: "Ideal", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300" };
  if (score <= 6) return { label: "Overweight", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300" };
  return { label: "Obese", color: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300" };
}

function StatusBadge({ status }: { status: string }) {
  if (status === "complete") return <span className="flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 rounded-full px-2 py-0.5"><CheckCircle2 size={11}/> Done</span>;
  if (status === "due_soon") return <span className="flex items-center gap-1 text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300 rounded-full px-2 py-0.5"><AlertCircle size={11}/> Due Soon</span>;
  return <span className="flex items-center gap-1 text-xs bg-secondary text-muted-foreground rounded-full px-2 py-0.5"><Circle size={11}/> Not Due</span>;
}

type Tab = "tracking" | "vet";

// ── Add Vet Record Form ───────────────────────────────────────────────────────
function AddVetForm({ catId, type, onDone }: { catId: string; type: VetRecord["type"]; onDone: () => void }) {
  const { addVetRecord } = useAuth();
  const [name, setName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [status, setStatus] = useState<VetRecord["status"]>("not_due");
  const [note, setNote] = useState("");
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    addVetRecord(catId, { type, name: name.trim(), date, status, note: note.trim() || undefined });
    onDone();
  }
  return (
    <form onSubmit={handleSubmit} className="mt-3 bg-secondary rounded-2xl p-3 space-y-2">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (e.g. Rabies) *"
        className="w-full bg-background rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:ring-2 focus:ring-[var(--coral)]" autoFocus/>
      <DatePicker value={date} onChange={setDate} className="bg-background border border-border" />
      <div className="flex gap-1">
        {(["complete","due_soon","not_due"] as const).map((s) => (
          <button key={s} type="button" onClick={() => setStatus(s)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${status===s?"bg-[var(--coral)] text-white":"bg-card border border-border text-muted-foreground"}`}>
            {s.replace("_"," ")}
          </button>
        ))}
      </div>
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)"
        className="w-full bg-background rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:ring-2 focus:ring-[var(--coral)]"/>
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onDone} className="flex-1 bg-card border border-border rounded-xl py-2 text-sm font-medium">Cancel</button>
        <button type="submit" disabled={!name.trim()} className="flex-1 bg-[var(--nav-dark)] text-white rounded-xl py-2 text-sm font-medium disabled:opacity-50">Save</button>
      </div>
    </form>
  );
}

function Health() {
  const { user, addWeightLog, addSleepLog, addHydrationLog } = useAuth();
  const cats = user?.cats ?? [];
  const activeCat = cats[0] ?? null;

  const [tab, setTab] = useState<Tab>("tracking");
  const [weight, setWeight] = useState(3.5);
  const [weightDate, setWeightDate] = useState(new Date().toISOString().split("T")[0]);
  const [weightNote, setWeightNote] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [weightSaved, setWeightSaved] = useState(false);

  const [hoursSlept, setHoursSlept] = useState(12);
  const [activity, setActivity] = useState<"sedentary"|"light"|"moderate"|"active">("light");
  const [bcs, setBcs] = useState(5);
  const [sleepSaved, setSleepSaved] = useState(false);

  const [waterMl, setWaterMl] = useState(150);
  const [hydrationSaved, setHydrationSaved] = useState(false);

  const [addingVet, setAddingVet] = useState<VetRecord["type"] | null>(null);

  // Real data from store
  const catId = activeCat?.id ?? "";
  const weightLogs = (user?.weightLogs ?? []).filter((l) => l.catId === catId).sort((a,b) => a.date.localeCompare(b.date));
  const sleepLogs  = (user?.sleepLogs ?? []).filter((l) => l.catId === catId).sort((a,b) => a.date.localeCompare(b.date));
  const hydrationLogs = (user?.hydrationLogs ?? []).filter((h) => h.catId === catId).sort((a,b) => a.date.localeCompare(b.date));
  const vetRecords = (user?.vetRecords ?? []).filter((r) => r.catId === catId);
  const vaccines   = vetRecords.filter((r) => r.type === "vaccine");
  const dewormings = vetRecords.filter((r) => r.type === "deworming");
  const medicalHistory = vetRecords.filter((r) => r.type === "medical").sort((a,b) => b.date.localeCompare(a.date));

  // Activity heatmap: last 7 days
  const activityMap: Record<string,number> = { sedentary:1, light:2, moderate:3, active:4 };
  const today = new Date();
  const heatmap = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() - (6 - i));
    const iso = d.toISOString().split("T")[0];
    const log = sleepLogs.filter((l) => l.date === iso).at(-1);
    return log ? activityMap[log.activity] : 0;
  });

  const badge = bcsBadge(bcs);
  const sliderColor = () => { const p = hoursSlept/24; return p<0.3?"#ef4444":p<0.5?"#f97316":"var(--coral)"; };

  function handleSaveWeight() {
    addWeightLog(catId, weight, weightDate, weightNote || undefined);
    setWeightSaved(true); setTimeout(() => setWeightSaved(false), 2000);
    setWeightNote(""); setNoteOpen(false);
  }

  function handleSaveSleep() {
    addSleepLog(catId, hoursSlept, activity, bcs, new Date().toISOString().split("T")[0]);
    setSleepSaved(true); setTimeout(() => setSleepSaved(false), 2000);
  }

  function handleSaveHydration() {
    addHydrationLog(catId, waterMl, new Date().toISOString().split("T")[0]);
    setHydrationSaved(true); setTimeout(() => setHydrationSaved(false), 2000);
  }

  if (!activeCat) return (
    <PhoneShell>
      <div className="px-6 pt-12 pb-4 flex items-center gap-3">
        <Link to="/" className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"><ArrowLeft size={18}/></Link>
        <h1 className="font-serif text-xl font-semibold flex-1 text-center pr-9">Health</h1>
      </div>
      <div className="px-6 py-16 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-[var(--coral-soft)] flex items-center justify-center mb-5"><PawPrint size={40} style={{color:"var(--coral)"}}/></div>
        <h2 className="font-serif text-xl font-semibold mb-2">No cat added yet</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-[240px]">Add a cat from the home page to start tracking health.</p>
        <Link to="/" className="bg-[var(--nav-dark)] text-white text-sm font-medium rounded-2xl px-5 py-3 hover:bg-[var(--coral)] transition-colors">Go to Home</Link>
      </div>
    </PhoneShell>
  );

  return (
    <PhoneShell>
      <motion.div variants={pageVariants} initial="hidden" animate="visible" exit="exit">
        <motion.div variants={childVariants} className="px-6 pt-12 pb-4 flex items-center gap-3">
          <motion.div whileTap={tapScale}><Link to="/" className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"><ArrowLeft size={18}/></Link></motion.div>
          <h1 className="font-serif text-xl font-semibold flex-1 text-center pr-9">{activeCat.name}'s Health</h1>
        </motion.div>

        <motion.div variants={childVariants} className="px-6 mb-5">
          <div className="flex bg-secondary rounded-2xl p-1 gap-1">
            {(["tracking","vet"] as Tab[]).map((t) => (
              <motion.button key={t} onClick={() => setTab(t)} whileTap={tapScale}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${tab===t?"bg-card shadow-sm text-foreground":"text-muted-foreground"}`}>
                {t === "tracking" ? "Health Tracking" : "Vet & Reminders"}
              </motion.button>
            ))}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">

        {tab === "tracking" && (
          <motion.div key="tracking" initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:20}}
            transition={{type:"spring",stiffness:350,damping:30}} className="px-6 space-y-5 pb-4">

            {/* Weight log */}
            <motion.div variants={cardVariants} initial="hidden" animate="visible" className="bg-card rounded-3xl p-5 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.1)]">
              <h2 className="font-serif text-lg font-semibold mb-4">Log Weight</h2>
              <div className="flex items-center justify-center gap-4 mb-4">
                <motion.button whileTap={tapScale} whileHover={{scale:1.06}} onClick={() => setWeight((w)=>Math.max(0.1,parseFloat((w-0.1).toFixed(1))))} className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center"><Minus size={20}/></motion.button>
                <div className="text-center">
                  <motion.span key={weight} initial={{scale:1.3,opacity:0}} animate={{scale:1,opacity:1}} transition={{type:"spring",stiffness:500,damping:22}} className="font-serif text-5xl font-semibold inline-block">{weight.toFixed(1)}</motion.span>
                  <span className="text-muted-foreground text-lg ml-1">kg</span>
                </div>
                <motion.button whileTap={tapScale} whileHover={{scale:1.06}} onClick={() => setWeight((w)=>parseFloat((w+0.1).toFixed(1)))} className="w-12 h-12 rounded-full bg-[var(--coral-soft)] flex items-center justify-center"><Plus size={20}/></motion.button>
              </div>
              <div className="mb-3">
                <label className="text-xs text-muted-foreground uppercase tracking-wide">Date</label>
                <div className="mt-1">
                  <DatePicker value={weightDate} onChange={setWeightDate} maxDate={new Date()} />
                </div>
              </div>
              <motion.button whileTap={{scale:0.97}} onClick={()=>setNoteOpen(!noteOpen)} className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                <motion.div animate={{rotate:noteOpen?180:0}} transition={{type:"spring",stiffness:300}}>{noteOpen?<ChevronUp size={12}/>:<ChevronDown size={12}/>}</motion.div>
                Add a note (optional)
              </motion.button>
              <AnimatePresence>
                {noteOpen && (
                  <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}} transition={{type:"spring",stiffness:300,damping:28}} className="overflow-hidden">
                    <textarea rows={2} value={weightNote} onChange={(e)=>setWeightNote(e.target.value)} placeholder="e.g. Weighed before breakfast..." className="w-full bg-secondary rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--coral)] resize-none mb-3"/>
                  </motion.div>
                )}
              </AnimatePresence>
              <motion.button whileTap={tapScale} onClick={handleSaveWeight}
                className={`w-full rounded-xl py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${weightSaved?"bg-emerald-500 text-white":"bg-[var(--nav-dark)] hover:bg-[var(--coral)] text-white"}`}>
                {weightSaved ? <><CheckCircle2 size={15}/> Saved!</> : "Save Weight"}
              </motion.button>
              {/* Weight history list */}
              {weightLogs.length > 0 && (
                <div className="mt-4 space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Recent logs</p>
                  {weightLogs.slice(-5).reverse().map((l) => (
                    <div key={l.id} className="flex justify-between items-center text-sm py-1 border-b border-border last:border-0">
                      <span className="text-muted-foreground">{l.date}</span>
                      <span className="font-semibold">{l.weight} kg</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Sleep & Activity */}
            <motion.div variants={cardVariants} initial="hidden" animate="visible" transition={{delay:0.05}} className="bg-card rounded-3xl p-5 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.1)]">
              <h2 className="font-serif text-lg font-semibold mb-4">Sleep & Activity</h2>
              <div className="mb-5">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium">Hours Slept</label>
                  <motion.span key={hoursSlept} initial={{scale:1.2}} animate={{scale:1}} transition={{type:"spring",stiffness:400}} className="font-serif text-2xl font-semibold">{hoursSlept}h</motion.span>
                </div>
                <input type="range" min={0} max={24} step={0.5} value={hoursSlept} onChange={(e)=>setHoursSlept(Number(e.target.value))} className="w-full h-2 rounded-full appearance-none cursor-pointer" style={{accentColor:sliderColor()}}/>
                <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>0h</span><span>12h</span><span>24h</span></div>
              </div>
              <div>
                <label className="text-sm font-medium">Activity Level</label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {(["sedentary","light","moderate","active"] as const).map((lvl) => (
                    <motion.button key={lvl} onClick={()=>setActivity(lvl)} whileTap={tapScale}
                      className={`py-2.5 rounded-xl text-sm font-medium capitalize transition-all ${activity===lvl?"bg-[var(--coral)] text-white":"bg-secondary text-foreground"}`}>{lvl}</motion.button>
                  ))}
                </div>
              </div>
              <div className="mt-4">
                <label className="text-sm font-medium">Body Condition Score</label>
                <div className="flex items-center gap-1.5 mt-2 mb-1">
                  {Array.from({length:9},(_,i)=>i+1).map((n) => (
                    <motion.button key={n} onClick={()=>setBcs(n)} whileTap={{scale:0.88}}
                      className={`flex-1 aspect-square rounded-lg text-xs font-medium transition-all ${n===bcs?"bg-[var(--coral)] text-white":n<bcs?"bg-[var(--coral-soft)] text-foreground":"bg-secondary text-muted-foreground"}`}>{n}</motion.button>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground"><span>Underweight</span><span className={`text-xs font-medium rounded-full px-2 py-0.5 ${badge.color}`}>{badge.label}</span><span>Obese</span></div>
              </div>
              <motion.button whileTap={tapScale} onClick={handleSaveSleep}
                className={`w-full mt-4 rounded-xl py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${sleepSaved?"bg-emerald-500 text-white":"bg-[var(--nav-dark)] hover:bg-[var(--coral)] text-white"}`}>
                {sleepSaved ? <><CheckCircle2 size={15}/> Saved!</> : "Save Sleep & Activity"}
              </motion.button>
            </motion.div>

            {/* Hydration */}
            <motion.div variants={cardVariants} initial="hidden" animate="visible" transition={{delay:0.08}} className="bg-card rounded-3xl p-5 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.1)]">
              <div className="flex items-center gap-2 mb-4">
                <Droplets size={17} className="text-muted-foreground" />
                <h2 className="font-serif text-lg font-semibold">Log Water Intake</h2>
              </div>
              <div className="flex items-center justify-center gap-4 mb-4">
                <motion.button whileTap={tapScale} whileHover={{scale:1.06}} onClick={() => setWaterMl((w)=>Math.max(0, w-25))} className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center"><Minus size={20}/></motion.button>
                <div className="text-center">
                  <motion.span key={waterMl} initial={{scale:1.3,opacity:0}} animate={{scale:1,opacity:1}} transition={{type:"spring",stiffness:500,damping:22}} className="font-serif text-5xl font-semibold inline-block">{waterMl}</motion.span>
                  <span className="text-muted-foreground text-lg ml-1">ml</span>
                </div>
                <motion.button whileTap={tapScale} whileHover={{scale:1.06}} onClick={() => setWaterMl((w)=>w+25)} className="w-12 h-12 rounded-full bg-[var(--coral-soft)] flex items-center justify-center"><Plus size={20}/></motion.button>
              </div>
              <motion.button whileTap={tapScale} onClick={handleSaveHydration}
                className={`w-full rounded-xl py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${hydrationSaved?"bg-emerald-500 text-white":"bg-[var(--nav-dark)] hover:bg-[var(--coral)] text-white"}`}>
                {hydrationSaved ? <><CheckCircle2 size={15}/> Saved!</> : "Save Water Intake"}
              </motion.button>
              {hydrationLogs.length > 0 && (
                <div className="mt-4 space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Recent logs</p>
                  {hydrationLogs.slice(-3).reverse().map((h) => (
                    <div key={h.id} className="flex justify-between items-center text-sm py-1 border-b border-border last:border-0">
                      <span className="text-muted-foreground">{h.date}</span>
                      <span className="font-semibold">{h.ml} ml</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Charts */}
            <motion.div variants={cardVariants} initial="hidden" animate="visible" transition={{delay:0.1}} className="bg-card rounded-3xl p-5 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.1)]">
              <h2 className="font-serif text-lg font-semibold mb-1">Weight Trend</h2>
              <p className="text-xs text-muted-foreground mb-3">{weightLogs.length} entries</p>
              <MiniLineChart data={weightLogs.map((l)=>l.weight)} color="var(--coral)"/>
            </motion.div>

            <motion.div variants={cardVariants} initial="hidden" animate="visible" transition={{delay:0.16}} className="bg-card rounded-3xl p-5 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.1)]">
              <h2 className="font-serif text-lg font-semibold mb-1">Sleep Pattern</h2>
              <p className="text-xs text-muted-foreground mb-3">{sleepLogs.length} entries</p>
              <MiniLineChart data={sleepLogs.map((l)=>l.hours)} color="#818cf8"/>
            </motion.div>

            <motion.div variants={cardVariants} initial="hidden" animate="visible" transition={{delay:0.22}} className="bg-card rounded-3xl p-5 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.1)]">
              <h2 className="font-serif text-lg font-semibold mb-1">Activity Heatmap</h2>
              <p className="text-xs text-muted-foreground">This week</p>
              <ActivityHeatmap data={heatmap}/>
            </motion.div>
          </motion.div>
        )}

        {tab === "vet" && (
          <motion.div key="vet" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}}
            transition={{type:"spring",stiffness:350,damping:30}} className="px-6 space-y-5 pb-4">

            {/* Vaccination */}
            <motion.div variants={cardVariants} initial="hidden" animate="visible" className="bg-card rounded-3xl p-5 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.1)]">
              <div className="flex items-center gap-2 mb-4"><Syringe size={18} className="text-muted-foreground"/><h2 className="font-serif text-lg font-semibold">Vaccination Schedule</h2></div>
              {vaccines.length === 0 ? <p className="text-sm text-muted-foreground text-center py-3">No vaccinations recorded yet.</p> : (
                <div className="space-y-2">
                  {vaccines.map((v) => (
                    <div key={v.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div><p className="text-sm font-medium">{v.name}</p><p className="text-xs text-muted-foreground">{v.date}{v.note ? ` · ${v.note}` : ""}</p></div>
                      <div className="flex items-center gap-2"><StatusBadge status={v.status}/></div>
                    </div>
                  ))}
                </div>
              )}
              {addingVet === "vaccine" ? <AddVetForm catId={catId} type="vaccine" onDone={()=>setAddingVet(null)}/> : (
                <button onClick={()=>setAddingVet("vaccine")} className="mt-4 w-full flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-2.5 text-sm text-muted-foreground hover:border-[var(--coral)] hover:text-[var(--coral)] transition-colors"><Plus size={14}/> Add vaccination</button>
              )}
            </motion.div>

            {/* Deworming */}
            <motion.div variants={cardVariants} initial="hidden" animate="visible" transition={{delay:0.06}} className="bg-card rounded-3xl p-5 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.1)]">
              <div className="flex items-center gap-2 mb-4"><Pill size={18} className="text-muted-foreground"/><h2 className="font-serif text-lg font-semibold">Deworming Schedule</h2></div>
              {dewormings.length === 0 ? <p className="text-sm text-muted-foreground text-center py-3">No deworming records yet.</p> : (
                <div className="space-y-2">
                  {dewormings.map((d) => (
                    <div key={d.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div><p className="text-sm font-medium">{d.name}</p><p className="text-xs text-muted-foreground">{d.date}</p></div>
                      <StatusBadge status={d.status}/>
                    </div>
                  ))}
                </div>
              )}
              {addingVet === "deworming" ? <AddVetForm catId={catId} type="deworming" onDone={()=>setAddingVet(null)}/> : (
                <button onClick={()=>setAddingVet("deworming")} className="mt-4 w-full flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-2.5 text-sm text-muted-foreground hover:border-[var(--coral)] hover:text-[var(--coral)] transition-colors"><Plus size={14}/> Add deworming</button>
              )}
            </motion.div>

            {/* Medical History */}
            <motion.div variants={cardVariants} initial="hidden" animate="visible" transition={{delay:0.12}} className="bg-card rounded-3xl p-5 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.1)]">
              <div className="flex items-center gap-2 mb-4"><Clock size={18} className="text-muted-foreground"/><h2 className="font-serif text-lg font-semibold">Medical History</h2></div>
              {medicalHistory.length === 0 ? <p className="text-sm text-muted-foreground text-center py-3">No medical history yet.</p> : (
                <div className="relative">
                  <div className="absolute left-3 top-0 bottom-0 w-px bg-border"/>
                  <div className="space-y-4 pl-10">
                    {medicalHistory.map((m,i) => (
                      <motion.div key={m.id} variants={slideUpVariants} className="relative">
                        <motion.div initial={{scale:0}} animate={{scale:1}} transition={{type:"spring",stiffness:500,delay:0.08*i}} className="absolute -left-7 top-1 w-2.5 h-2.5 rounded-full bg-[var(--coral)] border-2 border-background"/>
                        <p className="text-xs text-muted-foreground">{m.date}</p>
                        <p className="text-sm font-semibold mt-0.5">{m.name}</p>
                        {m.note && <p className="text-xs text-muted-foreground mt-0.5">{m.note}</p>}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
              {addingVet === "medical" ? <AddVetForm catId={catId} type="medical" onDone={()=>setAddingVet(null)}/> : (
                <button onClick={()=>setAddingVet("medical")} className="mt-4 w-full flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-2.5 text-sm text-muted-foreground hover:border-[var(--coral)] hover:text-[var(--coral)] transition-colors"><Plus size={14}/> Add medical event</button>
              )}
            </motion.div>
          </motion.div>
        )}
        </AnimatePresence>
      </motion.div>
    </PhoneShell>
  );
}
