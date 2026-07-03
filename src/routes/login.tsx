import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Eye, EyeOff, Mail, Lock, AlertCircle } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AuthShell } from "@/components/AuthShell";
import { useAuth } from "@/lib/auth";
import { authPageVariants, childVariants, cardVariants, tapScale } from "@/lib/motion";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign In — CatTwin AI" }] }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState({ email: false, password: false });

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 6;

  function validate() {
    if (!email) return "Email is required.";
    if (!emailValid) return "Enter a valid email address.";
    if (!password) return "Password is required.";
    if (!passwordValid) return "Password must be at least 6 characters.";
    return "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ email: true, password: true });
    const localErr = validate();
    if (localErr) { setError(localErr); return; }
    setError("");
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      navigate({ to: "/" });
    }
  }

  const showEmailError = touched.email && email && !emailValid;
  const showPassError = touched.password && password && !passwordValid;

  return (
    <AuthShell>
      {/* Blobs */}
      <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 0.5, scale: 1 }} transition={{ duration: 1.2 }}
        className="absolute top-0 right-0 w-48 h-48 rounded-full bg-[var(--coral-soft)] blur-3xl dark:opacity-20 pointer-events-none" />
      <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 0.3, scale: 1 }} transition={{ duration: 1.4, delay: 0.1 }}
        className="absolute top-20 -left-16 w-40 h-40 rounded-full bg-[var(--warm-yellow)]/30 blur-3xl pointer-events-none" />

      <motion.div variants={authPageVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col flex-1">
        {/* Header */}
        <motion.div variants={childVariants} className="relative px-6 pt-14 pb-0 z-10 flex items-center gap-3">
          <motion.div whileTap={tapScale}>
            <Link to="/welcome" className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0" aria-label="Go back">
              <ArrowLeft size={18} />
            </Link>
          </motion.div>
          <h1 className="font-serif text-xl font-semibold flex-1 text-center pr-9">Sign In</h1>
        </motion.div>

        {/* Title */}
        <motion.div variants={childVariants} className="relative px-6 pt-8 pb-0 z-10">
          <h1 className="font-serif text-[28px] font-semibold text-foreground leading-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-2">Sign in to continue tracking your cat's health.</p>
        </motion.div>

        {/* Form card */}
        <motion.div variants={cardVariants} className="relative px-6 pt-7 pb-0 z-10 flex-1">
          <div className="bg-card rounded-3xl p-5 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_-12px_rgba(0,0,0,0.4)] border border-border/60">

            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  className="flex items-center gap-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-xl px-3 py-2.5 mb-4 text-xs overflow-hidden"
                >
                  <AlertCircle size={14} className="shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* Email */}
              <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
                <label htmlFor="email" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</label>
                <motion.div
                  whileFocus={{ scale: 1.01 }}
                  className={`mt-1.5 flex items-center gap-2 bg-secondary rounded-xl px-3 py-0 border transition-colors ${showEmailError ? "border-red-400 dark:border-red-500" : "border-transparent focus-within:border-[var(--coral)]"}`}
                >
                  <Mail size={15} className="text-muted-foreground shrink-0" />
                  <input id="email" type="email" autoComplete="email" value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                    placeholder="you@example.com"
                    className="flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground/60"
                    aria-invalid={!!showEmailError} />
                </motion.div>
                <AnimatePresence>
                  {showEmailError && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                      className="mt-1 text-xs text-red-500 dark:text-red-400">Enter a valid email address.</motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Password */}
              <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.22 }}>
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Password</label>
                  <Link to="/forgot-password" className="text-xs text-[var(--coral)] hover:underline underline-offset-2">Forgot password?</Link>
                </div>
                <div className={`mt-1.5 flex items-center gap-2 bg-secondary rounded-xl px-3 py-0 border transition-colors ${showPassError ? "border-red-400 dark:border-red-500" : "border-transparent focus-within:border-[var(--coral)]"}`}>
                  <Lock size={15} className="text-muted-foreground shrink-0" />
                  <input id="password" type={showPass ? "text" : "password"} autoComplete="current-password" value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                    placeholder="••••••••"
                    className="flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground/60"
                    aria-invalid={!!showPassError} />
                  <motion.button type="button" onClick={() => setShowPass(!showPass)} whileTap={{ scale: 0.85 }}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1" aria-label={showPass ? "Hide" : "Show"}>
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span key={showPass ? "off" : "on"} initial={{ opacity: 0, rotate: -20 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 20 }} transition={{ duration: 0.15 }}>
                        {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </motion.span>
                    </AnimatePresence>
                  </motion.button>
                </div>
                <AnimatePresence>
                  {showPassError && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                      className="mt-1 text-xs text-red-500 dark:text-red-400">Password must be at least 6 characters.</motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Submit */}
              <motion.button
                type="submit" disabled={loading}
                whileTap={!loading ? tapScale : {}}
                whileHover={!loading ? { scale: 1.01 } : {}}
                className="w-full mt-2 flex items-center justify-center gap-2 bg-[var(--nav-dark)] hover:bg-[var(--coral)] disabled:opacity-60 text-white font-medium text-sm rounded-xl py-3.5 transition-colors"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {loading ? (
                    <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Signing in…
                    </motion.span>
                  ) : (
                    <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>Sign in</motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </form>

            {/* Divider */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or continue with</span>
              <div className="flex-1 h-px bg-border" />
            </motion.div>

            {/* Social buttons */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="flex gap-3">
              <SocialButton label="Google" icon={<GoogleIcon />} />
              <SocialButton label="Apple" icon={<AppleIcon />} />
            </motion.div>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div variants={childVariants} className="px-6 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" className="font-medium text-[var(--coral)] hover:underline underline-offset-2">Sign up free</Link>
          </p>
        </motion.div>
      </motion.div>
    </AuthShell>
  );
}

function SocialButton({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <motion.button
      whileHover={{ y: -2, boxShadow: "0 4px 16px -6px rgba(0,0,0,0.15)" }}
      whileTap={tapScale}
      className="flex-1 flex items-center justify-center gap-2 bg-secondary hover:bg-[var(--coral-soft)] border border-border rounded-xl py-2.5 text-sm font-medium text-foreground transition-colors"
    >
      {icon}{label}
    </motion.button>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
function AppleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  );
}
