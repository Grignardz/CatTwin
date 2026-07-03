import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, Heart, BarChart2, UtensilsCrossed } from "lucide-react";
import { motion } from "framer-motion";
import { AuthShell } from "@/components/AuthShell";
import {
  authPageVariants, childVariants, staggerContainer,
  cardVariants, tapScale,
} from "@/lib/motion";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "Welcome — CatTwin AI" },
      { name: "description", content: "Your cat's intelligent health companion." },
    ],
  }),
  component: Welcome,
});

const features = [
  { icon: Heart, label: "Health Tracking", desc: "Weight, sleep & activity logs" },
  { icon: UtensilsCrossed, label: "Smart Feeding", desc: "Personalised meal plans" },
  { icon: BarChart2, label: "AI Analytics", desc: "Trends, risks & breed insights" },
  { icon: Sparkles, label: "AI Assistant", desc: "Ask anything about your cat" },
];

function Welcome() {
  return (
    <AuthShell>
      <motion.div
        variants={authPageVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="flex flex-col min-h-screen"
      >
        {/* Hero blob background */}
        <div className="relative">
          {/* Top bar */}
          <motion.div variants={childVariants} className="relative px-6 pt-14 pb-0 flex items-center justify-between z-10">
            <span className="font-serif font-semibold text-lg text-foreground">CatTwin</span>
            <Link to="/login" className="text-sm font-medium text-foreground bg-secondary border border-border rounded-full px-4 py-1.5 hover:bg-[var(--coral-soft)] transition-colors">
              Sign in
            </Link>
          </motion.div>
        </div>

        {/* Headline */}
        <motion.div variants={childVariants} className="px-6 pt-7 pb-1">
          <h1 className="font-serif text-[28px] font-semibold text-foreground leading-tight">
            Your cat's intelligent<br />
            <span className="text-[var(--coral)]">health companion</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            Track health, nutrition and wellbeing — all in one beautifully simple app.
          </p>
        </motion.div>

        {/* Feature pills */}
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="px-6 pt-5 grid grid-cols-2 gap-2.5">
          {features.map(({ icon: Icon, label, desc }, i) => (
            <motion.div
              key={label}
              variants={cardVariants}
              custom={i}
              whileHover={{ y: -3, boxShadow: "0 8px 24px -8px rgba(0,0,0,0.15)" }}
              whileTap={tapScale}
              className="bg-card rounded-2xl p-3.5 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_12px_-4px_rgba(0,0,0,0.3)] border border-border/60 cursor-default"
            >
              <motion.div
                className="w-8 h-8 rounded-xl bg-[var(--coral-soft)] flex items-center justify-center mb-2.5"
                whileHover={{ rotate: 8, scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
              >
                <Icon size={15} style={{ color: "var(--coral)" }} />
              </motion.div>
              <p className="text-sm font-semibold text-foreground leading-tight">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA buttons */}
        <motion.div variants={childVariants} className="px-6 pt-6 pb-10 mt-auto space-y-3">
          <motion.div whileTap={tapScale}>
            <Link
              to="/signup"
              className="flex items-center justify-center gap-2 w-full bg-[var(--nav-dark)] hover:bg-[var(--coral)] text-white font-medium text-sm rounded-2xl py-3.5 transition-colors"
            >
              Get started — it's free
              <motion.span animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, repeatDelay: 2, duration: 0.5 }}>
                <ArrowRight size={16} />
              </motion.span>
            </Link>
          </motion.div>
          <motion.div whileTap={tapScale}>
            <Link
              to="/login"
              className="flex items-center justify-center w-full bg-secondary hover:bg-[var(--coral-soft)] text-foreground font-medium text-sm rounded-2xl py-3.5 transition-colors border border-border"
            >
              I already have an account
            </Link>
          </motion.div>
          <p className="text-center text-[11px] text-muted-foreground leading-relaxed pt-1">
            By continuing, you agree to our{" "}
            <button className="underline underline-offset-2 hover:text-foreground transition-colors">Terms</button>
            {" "}and{" "}
            <button className="underline underline-offset-2 hover:text-foreground transition-colors">Privacy Policy</button>.
          </p>
        </motion.div>
      </motion.div>
    </AuthShell>
  );
}
