import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Eye, EyeOff, Mail, Lock, User, CheckCircle2, AlertCircle } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AuthShell } from "@/components/AuthShell";
import { useAuth } from "@/lib/auth";
import { authPageVariants, childVariants, cardVariants, tapScale } from "@/lib/motion";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create Account — CatTwin AI" }] }),
  component: SignUp,
});

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "At least 8 characters", pass: password.length >= 8 },
    { label: "One uppercase letter",  pass: /[A-Z]/.test(password) },
    { label: "One number",            pass: /\d/.test(password) },
  ];
  const score = checks.filter((c) => c.pass).length;
  const colors = ["bg-red-400", "bg-orange-400", "bg-[var(--warm-yellow)]", "bg-emerald-500"];
  const labels = ["Weak", "Fair", "Good", "Strong"];
  if (!password) return null;
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} transition={{ type: "spring", stiffness: 300, damping: 28 }} className="mt-2 space-y-2 overflow-hidden">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div key={i} className={`flex-1 h-1 rounded-full ${i < score ? colors[score] : "bg-border"}`}
            animate={{ scaleX: i < score ? 1 : 0.95 }} transition={{ type: "spring", stiffness: 400 }} />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {checks.map((c) => (
            <motion.span key={c.label} animate={{ color: c.pass ? "#10b981" : "" }}
              className={`flex items-center gap-1 text-[10px] transition-colors ${c.pass ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
              <motion.div animate={c.pass ? { scale: [1, 1.4, 1], rotate: [0, 20, 0] } : {}} transition={{ duration: 0.3 }}>
                <CheckCircle2 size={10} className={c.pass ? "opacity-100" : "opacity-30"} />
              </motion.div>
              {c.label}
            </motion.span>
          ))}
        </div>
        <span className={`text-[10px] font-medium shrink-0 ${colors[score].replace("bg-", "text-").replace("var(--warm-yellow)", "[var(--warm-yellow)]")}`}>
          {labels[score]}
        </span>
      </div>
    </motion.div>
  );
}

function SignUp() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState({ name: false, email: false, password: false });

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordScore = [password.length >= 8, /[A-Z]/.test(password), /\d/.test(password)].filter(Boolean).length;

  function validate() {
    if (!name.trim())        return "Name is required.";
    if (!email)              return "Email is required.";
    if (!emailValid)         return "Enter a valid email address.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (!agreed)             return "Please agree to the terms to continue.";
    return "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true });
    const localErr = validate();
    if (localErr) { setError(localErr); return; }
    setError("");
    setLoading(true);
    const result = await signup(name, email, password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      navigate({ to: "/" });
    }
  }

  const showNameError  = touched.name && !name.trim();
  const showEmailError = touched.email && email && !emailValid;
  const showPassError  = touched.password && password && password.length < 8;

  const inputRow = (cls: string) =>
    `mt-1.5 flex items-center gap-2 bg-secondary rounded-xl px-3 py-0 border transition-colors ${cls}`;

  return (
    <AuthShell>
      <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 0.3, scale: 1 }} transition={{ duration: 1.3 }}
        className="absolute top-0 left-0 w-52 h-52 rounded-full bg-[var(--warm-yellow)]/30 blur-3xl pointer-events-none" />
      <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 0.6, scale: 1 }} transition={{ duration: 1.5, delay: 0.1 }}
        className="absolute top-32 -right-16 w-44 h-44 rounded-full bg-[var(--coral-soft)] blur-3xl dark:opacity-20 pointer-events-none" />

      <motion.div variants={authPageVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col flex-1">
        <motion.div variants={childVariants} className="relative px-6 pt-14 pb-0 z-10 flex items-center gap-3">
          <motion.div whileTap={tapScale}>
            <Link to="/welcome" className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0" aria-label="Go back">
              <ArrowLeft size={18} />
            </Link>
          </motion.div>
          <h1 className="font-serif text-xl font-semibold flex-1 text-center pr-9">Sign Up</h1>
        </motion.div>

        <motion.div variants={childVariants} className="relative px-6 pt-8 pb-0 z-10">
          <h1 className="font-serif text-[28px] font-semibold text-foreground leading-tight">Create your account</h1>
          <p className="text-sm text-muted-foreground mt-2">Join thousands of cat parents tracking their pet's health.</p>
        </motion.div>

        <motion.div variants={cardVariants} className="relative px-6 pt-7 pb-0 z-10 flex-1">
          <div className="bg-card rounded-3xl p-5 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_-12px_rgba(0,0,0,0.4)] border border-border/60">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div key="err" initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: -8, height: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  className="flex items-center gap-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-xl px-3 py-2.5 mb-4 text-xs overflow-hidden">
                  <AlertCircle size={14} className="shrink-0" />{error}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* Name */}
              <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12 }}>
                <label htmlFor="name" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Full name</label>
                <div className={inputRow(showNameError ? "border-red-400 dark:border-red-500" : "border-transparent focus-within:border-[var(--coral)]")}>
                  <User size={15} className="text-muted-foreground shrink-0" />
                  <input id="name" type="text" autoComplete="name" value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                    placeholder="Your full name"
                    className="flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground/60" />
                </div>
                <AnimatePresence>{showNameError && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-1 text-xs text-red-500 dark:text-red-400">Name is required.</motion.p>}</AnimatePresence>
              </motion.div>

              {/* Email */}
              <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.18 }}>
                <label htmlFor="email-signup" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</label>
                <div className={inputRow(showEmailError ? "border-red-400 dark:border-red-500" : "border-transparent focus-within:border-[var(--coral)]")}>
                  <Mail size={15} className="text-muted-foreground shrink-0" />
                  <input id="email-signup" type="email" autoComplete="email" value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                    placeholder="you@example.com"
                    className="flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground/60" />
                </div>
                <AnimatePresence>{showEmailError && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-1 text-xs text-red-500 dark:text-red-400">Enter a valid email address.</motion.p>}</AnimatePresence>
              </motion.div>

              {/* Password */}
              <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.24 }}>
                <label htmlFor="password-signup" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Password</label>
                <div className={inputRow(showPassError ? "border-red-400 dark:border-red-500" : "border-transparent focus-within:border-[var(--coral)]")}>
                  <Lock size={15} className="text-muted-foreground shrink-0" />
                  <input id="password-signup" type={showPass ? "text" : "password"} autoComplete="new-password" value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                    placeholder="Min. 8 characters"
                    className="flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground/60" />
                  <motion.button type="button" onClick={() => setShowPass(!showPass)} whileTap={{ scale: 0.85 }}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1" aria-label={showPass ? "Hide" : "Show"}>
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span key={showPass ? "off" : "on"} initial={{ opacity: 0, rotate: -20 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 20 }} transition={{ duration: 0.15 }}>
                        {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </motion.span>
                    </AnimatePresence>
                  </motion.button>
                </div>
                <PasswordStrength password={password} />
              </motion.div>

              {/* Terms */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="flex items-start gap-3 pt-1">
                <motion.button type="button" role="checkbox" aria-checked={agreed} onClick={() => setAgreed(!agreed)}
                  whileTap={{ scale: 0.88 }}
                  animate={agreed ? { backgroundColor: "var(--coral)", borderColor: "var(--coral)" } : {}}
                  className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${agreed ? "bg-[var(--coral)] border-[var(--coral)]" : "border-border bg-secondary"}`}>
                  <AnimatePresence>
                    {agreed && <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 500 }}>
                      <CheckCircle2 size={12} className="text-white" strokeWidth={3} />
                    </motion.div>}
                  </AnimatePresence>
                </motion.button>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  I agree to CatTwin's{" "}
                  <button type="button" className="text-[var(--coral)] underline underline-offset-2">Terms of Service</button>
                  {" "}and{" "}
                  <button type="button" className="text-[var(--coral)] underline underline-offset-2">Privacy Policy</button>
                </p>
              </motion.div>

              {/* Submit */}
              <motion.button type="submit" disabled={loading || passwordScore < 1}
                whileHover={!loading ? { scale: 1.01 } : {}} whileTap={!loading ? tapScale : {}}
                className="w-full mt-1 flex items-center justify-center gap-2 bg-[var(--nav-dark)] hover:bg-[var(--coral)] disabled:opacity-50 text-white font-medium text-sm rounded-xl py-3.5 transition-colors">
                <AnimatePresence mode="wait" initial={false}>
                  {loading ? (
                    <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Creating account…
                    </motion.span>
                  ) : (
                    <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>Create account</motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </form>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-border" /><span className="text-xs text-muted-foreground">or sign up with</span><div className="flex-1 h-px bg-border" />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="flex gap-3">
              <SocialButton label="Google" icon={<GoogleIcon />} />
              <SocialButton label="Apple" icon={<AppleIcon />} />
            </motion.div>
          </div>
        </motion.div>

        <motion.div variants={childVariants} className="px-6 py-8 text-center">
          <p className="text-sm text-muted-foreground">Already have an account?{" "}
            <Link to="/login" className="font-medium text-[var(--coral)] hover:underline underline-offset-2">Sign in</Link>
          </p>
        </motion.div>
      </motion.div>
    </AuthShell>
  );
}

function SocialButton({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <motion.button whileHover={{ y: -2, boxShadow: "0 4px 16px -6px rgba(0,0,0,0.15)" }} whileTap={tapScale}
      className="flex-1 flex items-center justify-center gap-2 bg-secondary hover:bg-[var(--coral-soft)] border border-border rounded-xl py-2.5 text-sm font-medium text-foreground transition-colors">
      {icon}{label}
    </motion.button>
  );
}
function GoogleIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>;
}
function AppleIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>;
}
