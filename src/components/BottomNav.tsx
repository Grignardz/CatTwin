import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Home,
  Heart,
  Utensils,
  BarChart2,
  MessageSquare,
  Settings,
  Camera,
  Sparkles,
  X,
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const items = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/health", icon: Heart, label: "Health" },
  { to: "/feeding", icon: Utensils, label: "Feeding" },
  { to: "/analytics", icon: BarChart2, label: "Analytics" },
];

/** Popup shown when tapping the Chat nav button — lets the user choose between the AI Assistant and the AI Photo Scan. */
function ChatChooser({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();

  function go(to: "/chat" | "/photo-analysis") {
    onClose();
    navigate({ to });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm flex items-end justify-center p-6 pb-28"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="w-full max-w-[380px] bg-card border border-border rounded-3xl p-5 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.4)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-lg font-semibold">Ask CatTwin AI</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => go("/chat")}
            className="w-full flex items-center gap-3 bg-secondary hover:bg-[var(--coral-soft)] rounded-2xl p-4 text-left transition-colors active:scale-[0.98]"
          >
            <div className="w-11 h-11 rounded-2xl bg-[var(--coral-soft)] flex items-center justify-center shrink-0">
              <MessageSquare size={19} style={{ color: "var(--coral)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">AI Assistant</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ask questions about health, feeding, and care.
              </p>
            </div>
          </button>

          <button
            onClick={() => go("/photo-analysis")}
            className="w-full flex items-center gap-3 bg-secondary hover:bg-[var(--coral-soft)] rounded-2xl p-4 text-left transition-colors active:scale-[0.98]"
          >
            <div className="w-11 h-11 rounded-2xl bg-[var(--coral-soft)] flex items-center justify-center shrink-0">
              <Camera size={19} style={{ color: "var(--coral)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold">AI Photo Scan</p>
                <Sparkles size={12} className="text-[var(--coral)]" />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Snap a photo for body condition & weight insights.
              </p>
            </div>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function BottomNav() {
  const { pathname } = useLocation();
  const [chooserOpen, setChooserOpen] = useState(false);
  const chatActive = pathname === "/chat" || pathname === "/photo-analysis";

  return (
    <motion.nav
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 28, delay: 0.15 }}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-[380px]"
    >
      <div className="flex items-center justify-between bg-[var(--nav-dark)] rounded-full px-2 py-2 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.35)]">
        {items.map(({ to, icon: Icon, label }) => {
          const active = pathname === to;
          return (
            <Link key={to} to={to}>
              <motion.div
                layout
                whileTap={{ scale: 0.88 }}
                className={`flex items-center gap-1.5 rounded-full transition-colors duration-150 ${
                  active
                    ? "bg-[var(--coral)] text-[oklch(0.2_0.02_260)] px-3 py-2"
                    : "text-white/70 px-3 py-2 hover:text-white"
                }`}
              >
                <motion.div
                  animate={active ? { rotate: [0, -12, 10, 0], scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                >
                  <Icon size={17} strokeWidth={2} />
                </motion.div>
                <AnimatePresence initial={false}>
                  {active && (
                    <motion.span
                      key="label"
                      initial={{ opacity: 0, width: 0, x: -4 }}
                      animate={{ opacity: 1, width: "auto", x: 0 }}
                      exit={{ opacity: 0, width: 0, x: -4 }}
                      transition={{ type: "spring", stiffness: 400, damping: 28 }}
                      className="text-xs font-medium whitespace-nowrap overflow-hidden"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </Link>
          );
        })}

        {/* Chat — opens a chooser between AI Assistant and AI Photo Scan */}
        <button onClick={() => setChooserOpen(true)} aria-label="Ask CatTwin AI">
          <motion.div
            layout
            whileTap={{ scale: 0.88 }}
            className={`flex items-center gap-1.5 rounded-full transition-colors duration-150 ${
              chatActive
                ? "bg-[var(--coral)] text-[oklch(0.2_0.02_260)] px-3 py-2"
                : "text-white/70 px-3 py-2 hover:text-white"
            }`}
          >
            <motion.div
              animate={chatActive ? { rotate: [0, -12, 10, 0], scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <MessageSquare size={17} strokeWidth={2} />
            </motion.div>
            <AnimatePresence initial={false}>
              {chatActive && (
                <motion.span
                  key="label"
                  initial={{ opacity: 0, width: 0, x: -4 }}
                  animate={{ opacity: 1, width: "auto", x: 0 }}
                  exit={{ opacity: 0, width: 0, x: -4 }}
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  className="text-xs font-medium whitespace-nowrap overflow-hidden"
                >
                  Chat
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
        </button>

        <Link to="/settings" aria-label="Settings">
          <motion.div
            layout
            whileTap={{ scale: 0.88 }}
            className={`flex items-center gap-1.5 rounded-full transition-colors duration-150 ${
              pathname === "/settings"
                ? "bg-[var(--coral)] text-[oklch(0.2_0.02_260)] px-3 py-2"
                : "text-white/70 px-3 py-2 hover:text-white"
            }`}
          >
            <motion.div
              animate={pathname === "/settings" ? { rotate: 90 } : { rotate: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
            >
              <Settings size={17} strokeWidth={2} />
            </motion.div>
          </motion.div>
        </Link>
      </div>

      <AnimatePresence>
        {chooserOpen && <ChatChooser onClose={() => setChooserOpen(false)} />}
      </AnimatePresence>
    </motion.nav>
  );
}
