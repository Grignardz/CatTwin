import { Link, useLocation } from "@tanstack/react-router";
import { Home, Heart, Utensils, BarChart2, MessageSquare, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const items = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/health", icon: Heart, label: "Health" },
  { to: "/feeding", icon: Utensils, label: "Feeding" },
  { to: "/analytics", icon: BarChart2, label: "Analytics" },
  { to: "/chat", icon: MessageSquare, label: "Chat" },
];

export function BottomNav() {
  const { pathname } = useLocation();
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
    </motion.nav>
  );
}
