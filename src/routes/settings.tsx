import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Camera, Plus, Edit2, Trash2, Download, ChevronRight, CheckCircle2, LogOut, X, FileText, AlertCircle, Lock, Eye, EyeOff } from "lucide-react";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PhoneShell } from "@/components/PhoneShell";
import { useTheme, type Theme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { requestBrowserNotificationPermission } from "@/lib/notifications";
import { tapScale } from "@/lib/motion";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — CatTwin AI" }] }),
  component: Settings,
});

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`w-10 h-6 rounded-full transition-colors relative ${on ? "bg-[var(--coral)]" : "bg-secondary"}`}
    >
      <div
        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          on ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

const COUNTRIES = [
  "United States", "United Kingdom", "Canada", "Australia", "India", "Germany",
  "France", "Spain", "Italy", "Netherlands", "Japan", "Singapore", "Other",
];

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const { changePassword } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 8) { setError("New password must be at least 8 characters."); return; }
    if (next !== confirm) { setError("Passwords don't match."); return; }
    setError("");
    setLoading(true);
    const result = await changePassword(current, next);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    setSuccess(true);
    setTimeout(onClose, 1200);
  }

  const fieldCls = "w-full bg-background rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:ring-2 focus:ring-[var(--coral)]";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-6" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94, y: 12 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-card rounded-3xl p-5 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)]"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-lg font-semibold flex items-center gap-2"><Lock size={16} /> Change Password</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center" aria-label="Close">
            <X size={14} />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center py-6 text-center">
            <CheckCircle2 size={32} className="text-emerald-500 mb-2" />
            <p className="text-sm font-medium">Password updated</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <div className="flex items-center gap-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-xl px-3 py-2.5 text-xs">
                <AlertCircle size={13} className="shrink-0" /> {error}
              </div>
            )}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wide">Current password</label>
              <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password"
                className={`mt-1 ${fieldCls}`} autoFocus />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wide">New password</label>
              <div className="mt-1 relative">
                <input type={show ? "text" : "password"} value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password"
                  className={fieldCls} placeholder="Min. 8 characters" />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {show ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wide">Confirm new password</label>
              <input type={show ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password"
                className={`mt-1 ${fieldCls}`} />
            </div>
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[var(--nav-dark)] hover:bg-[var(--coral)] disabled:opacity-60 text-white rounded-xl py-3 text-sm font-medium transition-colors mt-2">
              {loading ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : "Update password"}
            </button>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}

function CatsManager() {
  const { user, addCat, removeCat, updateCat } = useAuth();
  const cats = user?.cats ?? [];
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", breed: "", age: "" });
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [editForm, setEditForm] = useState({ name: "", breed: "", age: "" });
  const fileRef = useRef<HTMLInputElement>(null);

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    addCat({ name: form.name.trim(), breed: form.breed.trim() || "Unknown breed", age: form.age.trim() || "Unknown", photo });
    setForm({ name: "", breed: "", age: "" });
    setPhoto(undefined);
    setShowAdd(false);
  }

  function startEdit(cat: typeof cats[0]) {
    setEditingId(cat.id);
    setEditForm({ name: cat.name, breed: cat.breed, age: cat.age });
    setPhoto(cat.photo);
  }

  function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId || !editForm.name.trim()) return;
    updateCat(editingId, { name: editForm.name.trim(), breed: editForm.breed.trim(), age: editForm.age.trim(), photo });
    setEditingId(null);
    setPhoto(undefined);
  }

  const inputCls = "w-full bg-background rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:ring-2 focus:ring-[var(--coral)]";

  return (
    <div className="space-y-3">
      {cats.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-3">No cats added yet.</p>
      )}

      {cats.map((cat) => (
        <div key={cat.id}>
          {editingId === cat.id ? (
            <form onSubmit={handleEditSave} className="bg-secondary rounded-2xl p-3 space-y-2">
              {/* Photo in edit */}
              <div className="flex justify-center py-2">
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="w-14 h-14 rounded-full bg-background border-2 border-dashed border-border hover:border-[var(--coral)] transition-colors flex items-center justify-center overflow-hidden">
                  {photo ? (
                    <img src={photo} alt="Cat" className="w-full h-full object-cover" />
                  ) : (
                    <Camera size={18} className="text-muted-foreground" />
                  )}
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              </div>
              {photo && (
                <button type="button" onClick={() => setPhoto(undefined)} className="block mx-auto text-xs text-muted-foreground hover:text-red-500 transition-colors">Remove photo</button>
              )}
              <input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Name" className={inputCls} />
              <input value={editForm.breed} onChange={(e) => setEditForm((f) => ({ ...f, breed: e.target.value }))}
                placeholder="Breed" className={inputCls} />
              <input value={editForm.age} onChange={(e) => setEditForm((f) => ({ ...f, age: e.target.value }))}
                placeholder="Age" className={inputCls} />
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => { setEditingId(null); setPhoto(undefined); }}
                  className="flex-1 bg-card border border-border rounded-xl py-2 text-sm font-medium">Cancel</button>
                <button type="submit"
                  className="flex-1 bg-[var(--coral)] text-white rounded-xl py-2 text-sm font-medium">Save</button>
              </div>
            </form>
          ) : (
            <div className="flex items-center gap-3 bg-secondary rounded-2xl p-3">
              <div className="w-10 h-10 rounded-full bg-[var(--coral-soft)] flex items-center justify-center shrink-0 overflow-hidden">
                {cat.photo ? (
                  <img src={cat.photo} alt={cat.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-serif font-semibold text-sm" style={{ color: "var(--coral)" }}>
                    {cat.name[0].toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{cat.name}</p>
                <p className="text-xs text-muted-foreground">{cat.breed} · {cat.age}</p>
              </div>
              <Link to="/cat-profile" search={{ catId: cat.id }} className="w-8 h-8 rounded-full bg-card flex items-center justify-center" aria-label={`Full profile for ${cat.name}`}>
                <FileText size={13} />
              </Link>
              <button onClick={() => startEdit(cat)} className="w-8 h-8 rounded-full bg-card flex items-center justify-center" aria-label={`Edit ${cat.name}`}>
                <Edit2 size={13} />
              </button>
              <button onClick={() => removeCat(cat.id)} className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 flex items-center justify-center" aria-label={`Remove ${cat.name}`}>
                <X size={13} />
              </button>
            </div>
          )}
        </div>
      ))}

      {showAdd ? (
        <form onSubmit={handleAdd} className="bg-secondary rounded-2xl p-3 space-y-2 mt-1">
          {/* Photo upload */}
          <div className="flex justify-center py-2">
            <button type="button" onClick={() => fileRef.current?.click()}
              className="w-14 h-14 rounded-full bg-background border-2 border-dashed border-border hover:border-[var(--coral)] transition-colors flex items-center justify-center overflow-hidden">
              {photo ? (
                <img src={photo} alt="Cat" className="w-full h-full object-cover" />
              ) : (
                <Camera size={18} className="text-muted-foreground" />
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          </div>
          {photo && (
            <button type="button" onClick={() => setPhoto(undefined)} className="block mx-auto text-xs text-muted-foreground hover:text-red-500 transition-colors">Remove photo</button>
          )}
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Name *" className={inputCls} autoFocus />
          <input value={form.breed} onChange={(e) => setForm((f) => ({ ...f, breed: e.target.value }))}
            placeholder="Breed" className={inputCls} />
          <input value={form.age} onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
            placeholder="Age" className={inputCls} />
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => { setShowAdd(false); setPhoto(undefined); }}
              className="flex-1 bg-card border border-border rounded-xl py-2 text-sm font-medium">Cancel</button>
            <button type="submit" disabled={!form.name.trim()}
              className="flex-1 bg-[var(--nav-dark)] text-white rounded-xl py-2 text-sm font-medium disabled:opacity-50">Add</button>
          </div>
        </form>
      ) : (
        <button onClick={() => setShowAdd(true)}
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-2xl py-3 text-sm text-muted-foreground hover:border-[var(--coral)] hover:text-[var(--coral)] transition-colors">
          <Plus size={16} />
          Add New Cat
        </button>
      )}
    </div>
  );
}

function Settings() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { user, logout, updateUser, deleteAllCatData } = useAuth();
  const [editName, setEditName] = useState(user?.name ?? "");
  const [nameSaved, setNameSaved] = useState(false);
  const [notifVet, setNotifVet] = useState(user?.preferences?.notifVet ?? true);
  const [notifWeight, setNotifWeight] = useState(user?.preferences?.notifWeight ?? true);
  const [notifFeeding, setNotifFeeding] = useState(user?.preferences?.notifFeeding ?? false);
  const [browserNotif, setBrowserNotif] = useState(user?.preferences?.browserNotifications ?? false);
  const [browserNotifDenied, setBrowserNotifDenied] = useState(false);
  const [units, setUnits] = useState<"kg" | "lbs">(user?.preferences?.units ?? "kg");
  const [dateFormat, setDateFormat] = useState<"MM/DD/YYYY" | "DD/MM/YYYY">(user?.preferences?.dateFormat ?? "MM/DD/YYYY");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [country, setCountry] = useState(user?.country ?? "");
  const [phoneSaved, setPhoneSaved] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);

  // Derive initials from real user name
  const initials = (user?.name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateUser({ avatar: reader.result as string });
    reader.readAsDataURL(file);
  }

  function handleSavePhoneCountry() {
    updateUser({ phone: phone.trim() || undefined, country: country || undefined });
    setPhoneSaved(true);
    setTimeout(() => setPhoneSaved(false), 2000);
  }

  function handleSaveName() {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === user?.name) return;
    updateUser({ name: trimmed });
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2000);
  }

  async function handleBrowserNotifToggle(next: boolean) {
    if (!next) {
      setBrowserNotif(false);
      setBrowserNotifDenied(false);
      updateUser({ preferences: { browserNotifications: false } });
      return;
    }
    const permission = await requestBrowserNotificationPermission();
    if (permission === "granted") {
      setBrowserNotif(true);
      setBrowserNotifDenied(false);
      updateUser({ preferences: { browserNotifications: true } });
    } else {
      setBrowserNotif(false);
      setBrowserNotifDenied(permission === "denied");
    }
  }

  async function handleDeleteAll() {
    setDeleteLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    // Delete all data for every cat
    (user?.cats ?? []).forEach((c) => deleteAllCatData(c.id));
    setDeleteLoading(false);
    setDeleteConfirm(false);
    setDeleteSuccess(true);
    setTimeout(() => setDeleteSuccess(false), 4000);
  }

  async function handleLogout() {
    setLogoutLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    logout();
    navigate({ to: "/welcome" });
  }

  return (
    <PhoneShell>
      <div className="px-6 pt-12 pb-4 flex items-center gap-3">
        <Link to="/" className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="font-serif text-xl font-semibold flex-1 text-center pr-9">Settings</h1>
      </div>

      <div className="px-6 space-y-5 pb-6">
        {/* User Profile */}
        <div className="bg-card rounded-3xl p-5 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.1)]">
          <h2 className="font-serif text-lg font-semibold mb-4">Profile</h2>
          <div className="flex items-center gap-4 mb-5">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-[var(--coral-soft)] overflow-hidden flex items-center justify-center">
                {user?.avatar ? (
                  <img src={user.avatar} alt="Your avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-serif text-2xl font-semibold text-[var(--coral)]">{initials}</span>
                )}
              </div>
              <button
                onClick={() => avatarRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[var(--nav-dark)] text-white flex items-center justify-center active:scale-90 transition-transform"
                aria-label="Upload avatar"
              >
                <Camera size={12} />
              </button>
              <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>
            <div className="flex-1">
              <p className="font-semibold">{user?.name ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{user?.email ?? "—"}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wide">Name</label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                className="mt-1 w-full bg-secondary rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--coral)]"
              />
              {nameSaved && (
                <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 size={11} /> Name updated
                </p>
              )}
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wide">Email</label>
              <input
                value={user?.email ?? ""}
                readOnly
                className="mt-1 w-full bg-secondary rounded-xl px-3 py-2.5 text-sm outline-none text-muted-foreground cursor-not-allowed"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wide">Phone (optional)</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={handleSavePhoneCountry}
                onKeyDown={(e) => e.key === "Enter" && handleSavePhoneCountry()}
                placeholder="+1 555 123 4567"
                className="mt-1 w-full bg-secondary rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--coral)] placeholder:text-muted-foreground/50"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wide">Country</label>
              <select
                value={country}
                onChange={(e) => { setCountry(e.target.value); updateUser({ country: e.target.value || undefined }); setPhoneSaved(true); setTimeout(() => setPhoneSaved(false), 2000); }}
                className="mt-1 w-full bg-secondary rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--coral)]"
              >
                <option value="">Select country</option>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {phoneSaved && (
                <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 size={11} /> Saved
                </p>
              )}
            </div>
            <button onClick={() => setShowPasswordModal(true)} className="text-xs text-[var(--coral)] underline underline-offset-2">
              Change password
            </button>
          </div>
        </div>

        {/* Cats Management */}
        <div className="bg-card rounded-3xl p-5 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.1)]">
          <h2 className="font-serif text-lg font-semibold mb-4">My Cats</h2>
          <CatsManager />
        </div>

        {/* Preferences */}
        <div className="bg-card rounded-3xl p-5 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.1)]">
          <h2 className="font-serif text-lg font-semibold mb-4">Preferences</h2>
          <div className="space-y-4">
            {/* Theme */}
            <div>
              <label className="text-sm font-medium">Theme</label>
              <div className="flex gap-2 mt-2">
                {(["light", "dark", "system"] as Theme[]).map((t) => (
                  <button key={t} onClick={() => setTheme(t)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium capitalize transition-all active:scale-95 ${theme === t ? "bg-[var(--coral)] text-white" : "bg-secondary text-foreground"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Notifications */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Notifications</label>
                <Link to="/notifications" className="text-xs text-[var(--coral)] font-medium">View all</Link>
              </div>
              <div className="space-y-2">
                {[
                  { label: "Vet reminders", on: notifVet, set: (v: boolean) => { setNotifVet(v); updateUser({ preferences: { notifVet: v } }); } },
                  { label: "Weight & health alerts", on: notifWeight, set: (v: boolean) => { setNotifWeight(v); updateUser({ preferences: { notifWeight: v } }); } },
                  { label: "Feeding reminders", on: notifFeeding, set: (v: boolean) => { setNotifFeeding(v); updateUser({ preferences: { notifFeeding: v } }); } },
                ].map((n) => (
                  <div key={n.label} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{n.label}</span>
                    <Toggle on={n.on} onChange={n.set} />
                  </div>
                ))}

                {/* Browser notification toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-muted-foreground">Browser alerts</span>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5 max-w-[200px]">Native pop-ups while this tab is open</p>
                  </div>
                  <Toggle on={browserNotif} onChange={handleBrowserNotifToggle} />
                </div>
                {browserNotifDenied && (
                  <p className="text-[11px] text-orange-500 dark:text-orange-400">
                    Browser notifications are blocked. Enable them in your browser's site settings to use this feature.
                  </p>
                )}
              </div>
            </div>

            {/* Units */}
            <div>
              <label className="text-sm font-medium">Weight Unit</label>
              <div className="flex gap-2 mt-2">
                {(["kg", "lbs"] as const).map((u) => (
                  <button key={u} onClick={() => { setUnits(u); updateUser({ preferences: { units: u } }); }}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all active:scale-95 ${units === u ? "bg-[var(--coral)] text-white" : "bg-secondary text-foreground"}`}>
                    {u}
                  </button>
                ))}
              </div>
            </div>

            {/* Date format */}
            <div>
              <label className="text-sm font-medium">Date Format</label>
              <div className="flex gap-2 mt-2">
                {(["MM/DD/YYYY", "DD/MM/YYYY"] as const).map((f) => (
                  <button key={f} onClick={() => { setDateFormat(f); updateUser({ preferences: { dateFormat: f } }); }}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all active:scale-95 ${dateFormat === f ? "bg-[var(--coral)] text-white" : "bg-secondary text-foreground"}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Privacy & Security */}
        <div className="bg-card rounded-3xl p-5 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.1)]">
          <h2 className="font-serif text-lg font-semibold mb-4">Privacy & Security</h2>
          <div className="space-y-3">
            <Link to="/reports" className="w-full flex items-center justify-between bg-secondary rounded-xl px-4 py-3 text-sm font-medium active:scale-95 transition-transform">
              <div className="flex items-center gap-2">
                <Download size={16} className="text-muted-foreground" />
                Export my data
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </Link>

            {/* Success banner */}
            {deleteSuccess && (
              <div className="flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-xl px-4 py-3 text-sm font-medium animate-in slide-in-from-top-1 duration-200">
                <CheckCircle2 size={16} className="shrink-0" />
                All records deleted successfully.
              </div>
            )}

            {!deleteConfirm ? (
              <button
                onClick={() => setDeleteConfirm(true)}
                disabled={deleteSuccess}
                className="w-full flex items-center gap-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl px-4 py-3 text-sm font-medium active:scale-95 transition-transform disabled:opacity-40"
              >
                <Trash2 size={16} />
                Delete all records
              </button>
            ) : (
              <div className="bg-red-100 dark:bg-red-900/30 rounded-xl p-4 animate-in slide-in-from-top-1 duration-200">
                <p className="text-sm text-red-700 dark:text-red-300 font-medium mb-1">Delete all records?</p>
                <p className="text-xs text-red-600 dark:text-red-400 mb-4 leading-relaxed">
                  This will permanently remove all health logs, feeding records, vet history, chat conversations, and dismissed notifications. This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    disabled={deleteLoading}
                    className="flex-1 bg-secondary text-foreground rounded-xl py-2.5 text-sm font-medium disabled:opacity-50 active:scale-95 transition-transform"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAll}
                    disabled={deleteLoading}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-70 active:scale-95 transition-all"
                  >
                    {deleteLoading ? (
                      <>
                        <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        Deleting…
                      </>
                    ) : (
                      <>
                        <Trash2 size={14} />
                        Delete
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-1">
              <button className="text-xs text-muted-foreground underline underline-offset-2">Privacy Policy</button>
              <button className="text-xs text-muted-foreground underline underline-offset-2">Terms of Service</button>
            </div>
          </div>
        </div>

        {/* Sign Out */}
        <div className="bg-card rounded-3xl p-5 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.1)]">
          <h2 className="font-serif text-lg font-semibold mb-4">Account</h2>

          {!logoutConfirm ? (
            <button
              onClick={() => setLogoutConfirm(true)}
              className="w-full flex items-center justify-between bg-secondary hover:bg-[var(--coral-soft)] rounded-xl px-4 py-3 text-sm font-medium transition-colors active:scale-95 transition-transform group"
            >
              <div className="flex items-center gap-2 text-foreground">
                <LogOut size={16} className="text-muted-foreground group-hover:text-[var(--coral)] transition-colors" style={{}} />
                Sign out
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          ) : (
            <div className="bg-[var(--coral-soft)] rounded-xl p-4 animate-in slide-in-from-top-1 duration-200">
              <p className="text-sm font-semibold text-foreground mb-1">Sign out of CatTwin?</p>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                You'll need to sign back in to access your cats' health data.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setLogoutConfirm(false)}
                  disabled={logoutLoading}
                  className="flex-1 bg-card text-foreground border border-border rounded-xl py-2.5 text-sm font-medium disabled:opacity-50 active:scale-95 transition-transform"
                >
                  Stay
                </button>
                <button
                  onClick={handleLogout}
                  disabled={logoutLoading}
                  className="flex-1 flex items-center justify-center gap-2 bg-[var(--nav-dark)] hover:bg-[var(--coral)] text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-70 active:scale-95 transition-all"
                >
                  {logoutLoading ? (
                    <>
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Signing out…
                    </>
                  ) : (
                    <>
                      <LogOut size={14} />
                      Sign out
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      <AnimatePresence>
        {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
      </AnimatePresence>
    </PhoneShell>
  );
}
