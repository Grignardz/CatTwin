import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import {
  ArrowLeft, Camera, Save, PawPrint, Fingerprint,
  CalendarDays, Ruler, Palette, Home as HomeIcon,
  AlertTriangle, Stethoscope, FileText, CheckCircle2,
} from "lucide-react";
import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { PhoneShell } from "@/components/PhoneShell";
import { DatePicker } from "@/components/DatePicker";
import { useAuth } from "@/lib/auth";
import { pageVariants, childVariants, cardVariants, tapScale } from "@/lib/motion";

const searchSchema = z.object({
  catId: z.string(),
});

export const Route = createFileRoute("/cat-profile")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Cat Profile — CatTwin AI" }] }),
  component: CatProfile,
});

function SectionLabel({ icon: Icon, children }: { icon: typeof PawPrint; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon size={15} className="text-muted-foreground" />
      <h2 className="font-serif text-base font-semibold">{children}</h2>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground uppercase tracking-wide">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

const inputCls = "w-full bg-secondary rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--coral)] placeholder:text-muted-foreground/60";
const textareaCls = `${inputCls} resize-none`;

function Pill<T extends string>({ value, options, onChange }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {options.map((opt) => (
        <button
          key={opt.v}
          type="button"
          onClick={() => onChange(opt.v)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
            value === opt.v ? "bg-[var(--coral)] text-white" : "bg-secondary text-foreground"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function CatProfile() {
  const navigate = useNavigate();
  const { catId } = Route.useSearch();
  const { user, updateCat } = useAuth();
  const cat = user?.cats.find((c) => c.id === catId) ?? null;
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: cat?.name ?? "",
    breed: cat?.breed ?? "",
    age: cat?.age ?? "",
    dob: cat?.dob ?? "",
    gender: cat?.gender ?? "unknown",
    weightKg: cat?.weightKg?.toString() ?? "",
    targetWeightKg: cat?.targetWeightKg?.toString() ?? "",
    color: cat?.color ?? "",
    environment: cat?.environment ?? "indoor",
    allergies: cat?.allergies ?? "",
    existingDiseases: cat?.existingDiseases ?? "",
    medicalNotes: cat?.medicalNotes ?? "",
    microchipId: cat?.microchipId ?? "",
    neutered: cat?.neutered ?? "unknown",
  });
  const [photo, setPhoto] = useState<string | undefined>(cat?.photo);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!cat) return;
    updateCat(cat.id, {
      name: form.name.trim() || cat.name,
      breed: form.breed.trim(),
      age: form.age.trim(),
      dob: form.dob || undefined,
      gender: form.gender as "male" | "female" | "unknown",
      weightKg: form.weightKg ? parseFloat(form.weightKg) : undefined,
      targetWeightKg: form.targetWeightKg ? parseFloat(form.targetWeightKg) : undefined,
      color: form.color.trim() || undefined,
      environment: form.environment as "indoor" | "outdoor" | "both",
      allergies: form.allergies.trim() || undefined,
      existingDiseases: form.existingDiseases.trim() || undefined,
      medicalNotes: form.medicalNotes.trim() || undefined,
      microchipId: form.microchipId.trim() || undefined,
      neutered: form.neutered as "yes" | "no" | "unknown",
      photo,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  }

  if (!cat) {
    return (
      <PhoneShell>
        <div className="px-6 pt-12 pb-4 flex items-center gap-3">
          <Link to="/" className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"><ArrowLeft size={18} /></Link>
          <h1 className="font-serif text-xl font-semibold flex-1 text-center pr-9">Cat Profile</h1>
        </div>
        <div className="px-6 py-16 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-[var(--coral-soft)] flex items-center justify-center mb-5">
            <PawPrint size={40} style={{ color: "var(--coral)" }} />
          </div>
          <h2 className="font-serif text-xl font-semibold mb-2">Cat not found</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-[240px]">This cat may have been removed.</p>
          <Link to="/" className="bg-[var(--nav-dark)] text-white text-sm font-medium rounded-2xl px-5 py-3 hover:bg-[var(--coral)] transition-colors">Go to Home</Link>
        </div>
      </PhoneShell>
    );
  }

  return (
    <PhoneShell>
      <motion.div variants={pageVariants} initial="hidden" animate="visible" exit="exit">
        <motion.div variants={childVariants} className="px-6 pt-12 pb-4 flex items-center gap-3">
          <motion.div whileTap={tapScale}>
            <Link to="/" className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"><ArrowLeft size={18} /></Link>
          </motion.div>
          <h1 className="font-serif text-xl font-semibold flex-1 text-center pr-9">{cat.name}'s Profile</h1>
        </motion.div>

        <form onSubmit={handleSave} className="px-6 space-y-5 pb-8">
          {/* Photo + basic identity */}
          <motion.div variants={cardVariants} className="bg-card rounded-3xl p-5 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.1)]">
            <div className="flex flex-col items-center mb-4">
              <button type="button" onClick={() => fileRef.current?.click()}
                className="relative w-24 h-24 rounded-full bg-secondary border-2 border-dashed border-border hover:border-[var(--coral)] transition-colors flex items-center justify-center overflow-hidden group">
                {photo ? (
                  <img src={photo} alt={cat.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <Camera size={22} className="text-muted-foreground group-hover:text-[var(--coral)] transition-colors" />
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

            <SectionLabel icon={PawPrint}>Basic Info</SectionLabel>
            <div className="space-y-3">
              <Field label="Name"><input value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Breed"><input value={form.breed} onChange={(e) => set("breed", e.target.value)} className={inputCls} /></Field>
                <Field label="Age"><input value={form.age} onChange={(e) => set("age", e.target.value)} className={inputCls} /></Field>
              </div>
              <Field label="Gender">
                <Pill value={form.gender} onChange={(v) => set("gender", v)}
                  options={[{ v: "male", label: "Male" }, { v: "female", label: "Female" }, { v: "unknown", label: "Unknown" }]} />
              </Field>
              <Field label="Neutered / Spayed">
                <Pill value={form.neutered} onChange={(v) => set("neutered", v)}
                  options={[{ v: "yes", label: "Yes" }, { v: "no", label: "No" }, { v: "unknown", label: "Unknown" }]} />
              </Field>
            </div>
          </motion.div>

          {/* Dates & physical */}
          <motion.div variants={cardVariants} className="bg-card rounded-3xl p-5 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.1)]">
            <SectionLabel icon={CalendarDays}>Dates & Physical</SectionLabel>
            <div className="space-y-3">
              <Field label="Date of Birth">
                <DatePicker value={form.dob} onChange={(v) => set("dob", v)} maxDate={new Date()} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Weight (kg)">
                  <input type="number" step="0.1" inputMode="decimal" value={form.weightKg} onChange={(e) => set("weightKg", e.target.value)} className={inputCls} />
                </Field>
                <Field label="Target Weight (kg)">
                  <input type="number" step="0.1" inputMode="decimal" value={form.targetWeightKg} onChange={(e) => set("targetWeightKg", e.target.value)} className={inputCls} />
                </Field>
              </div>
              <Field label="Color / Coat"><input value={form.color} onChange={(e) => set("color", e.target.value)} className={inputCls} /></Field>
            </div>
          </motion.div>

          {/* Lifestyle */}
          <motion.div variants={cardVariants} className="bg-card rounded-3xl p-5 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.1)]">
            <SectionLabel icon={HomeIcon}>Lifestyle</SectionLabel>
            <Field label="Environment">
              <Pill value={form.environment} onChange={(v) => set("environment", v)}
                options={[{ v: "indoor", label: "Indoor" }, { v: "outdoor", label: "Outdoor" }, { v: "both", label: "Both" }]} />
            </Field>
          </motion.div>

          {/* Medical */}
          <motion.div variants={cardVariants} className="bg-card rounded-3xl p-5 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.1)]">
            <SectionLabel icon={Stethoscope}>Medical Information</SectionLabel>
            <div className="space-y-3">
              <Field label="Allergies">
                <textarea rows={2} value={form.allergies} onChange={(e) => set("allergies", e.target.value)} className={textareaCls} />
              </Field>
              <Field label="Existing Diseases">
                <textarea rows={2} value={form.existingDiseases} onChange={(e) => set("existingDiseases", e.target.value)} className={textareaCls} />
              </Field>
              <Field label="Medical Notes">
                <textarea rows={3} value={form.medicalNotes} onChange={(e) => set("medicalNotes", e.target.value)} className={textareaCls} />
              </Field>
              <Field label="Microchip ID (optional)">
                <input value={form.microchipId} onChange={(e) => set("microchipId", e.target.value)} className={inputCls} />
              </Field>
            </div>
          </motion.div>

          <motion.button
            type="submit"
            variants={childVariants}
            whileTap={tapScale}
            whileHover={{ scale: 1.01 }}
            className={`w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-medium transition-colors ${
              saved ? "bg-emerald-500 text-white" : "bg-[var(--nav-dark)] hover:bg-[var(--coral)] text-white"
            }`}
          >
            {saved ? <><CheckCircle2 size={16} /> Profile Saved</> : <><Save size={16} /> Save Profile</>}
          </motion.button>
        </form>
      </motion.div>
    </PhoneShell>
  );
}
