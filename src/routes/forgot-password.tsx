import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Mail, CheckCircle2, AlertCircle } from "lucide-react";
import { useState } from "react";
import { AuthShell } from "@/components/AuthShell";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset Password — CatTwin AI" }] }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) { setError("Email is required."); return; }
    if (!emailValid) { setError("Enter a valid email address."); return; }
    setError("");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setSent(true);
  }

  return (
    <AuthShell>
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-52 h-52 rounded-full bg-[var(--coral-soft)] blur-3xl opacity-50 dark:opacity-20 pointer-events-none" />
      <div className="absolute bottom-24 -left-20 w-48 h-48 rounded-full bg-[var(--warm-yellow)]/25 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative px-6 pt-14 pb-0 z-10 flex items-center gap-3">
        <Link
          to="/login"
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0 active:scale-95 transition-transform"
          aria-label="Go back"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="font-serif text-xl font-semibold flex-1 text-center pr-9">Reset Password</h1>
      </div>

      <div className="relative px-6 pt-10 z-10 flex-1 flex flex-col">
        {!sent ? (
          <>
            {/* Title */}
            <div className="mb-8">
              <div className="w-14 h-14 rounded-2xl bg-[var(--coral-soft)] flex items-center justify-center mb-5">
                <Mail size={24} style={{ color: "var(--coral)" }} />
              </div>
              <h1 className="font-serif text-[26px] font-semibold text-foreground leading-tight">
                Forgot your password?
              </h1>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                No worries. Enter your email and we'll send you a reset link.
              </p>
            </div>

            {/* Form card */}
            <div className="bg-card rounded-3xl p-5 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_-12px_rgba(0,0,0,0.4)] border border-border/60">
              {error && (
                <div className="flex items-center gap-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-xl px-3 py-2.5 mb-4 text-xs animate-in slide-in-from-top-1 duration-200">
                  <AlertCircle size={14} className="shrink-0" />
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div>
                  <label htmlFor="reset-email" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Email address
                  </label>
                  <div className={`mt-1.5 flex items-center gap-2 bg-secondary rounded-xl px-3 py-0 border transition-colors ${
                    error ? "border-red-400 dark:border-red-500" : "border-transparent focus-within:border-[var(--coral)]"
                  }`}>
                    <Mail size={15} className="text-muted-foreground shrink-0" />
                    <input
                      id="reset-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(""); }}
                      placeholder="you@example.com"
                      className="flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground/60"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-[var(--nav-dark)] hover:bg-[var(--coral)] disabled:opacity-60 text-white font-medium text-sm rounded-xl py-3.5 transition-colors active:scale-[0.97] duration-100"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Sending…
                    </>
                  ) : (
                    "Send reset link"
                  )}
                </button>
              </form>
            </div>
          </>
        ) : (
          /* Success state */
          <div className="flex-1 flex flex-col items-center justify-center text-center px-2 pb-20 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mb-6">
              <CheckCircle2 size={36} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="font-serif text-2xl font-semibold text-foreground">Check your inbox</h2>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed max-w-[280px]">
              We sent a password reset link to{" "}
              <span className="font-medium text-foreground">{email}</span>.
              It may take a minute or two.
            </p>
            <div className="mt-8 w-full space-y-3">
              <button
                onClick={() => { setSent(false); setEmail(""); }}
                className="w-full bg-secondary hover:bg-[var(--coral-soft)] border border-border text-foreground font-medium text-sm rounded-xl py-3.5 transition-colors"
              >
                Try a different email
              </button>
              <Link
                to="/login"
                className="block w-full bg-[var(--nav-dark)] hover:bg-[var(--coral)] text-white font-medium text-sm rounded-xl py-3.5 text-center transition-colors"
              >
                Back to sign in
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {!sent && (
        <div className="px-6 py-8 text-center">
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Back to sign in
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
