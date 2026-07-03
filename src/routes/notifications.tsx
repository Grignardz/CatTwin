import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft, Bell, BellOff, UtensilsCrossed, Syringe, Pill,
  Stethoscope, HeartPulse, Sparkles, X, PawPrint,
} from "lucide-react";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PhoneShell } from "@/components/PhoneShell";
import { useAuth } from "@/lib/auth";
import { computeNotifications, type AppNotification, type NotificationKind } from "@/lib/notifications";
import { pageVariants, childVariants, staggerContainer, slideUpVariants, tapScale } from "@/lib/motion";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — CatTwin AI" }] }),
  component: NotificationsPage,
});

const KIND_ICON: Record<NotificationKind, typeof Bell> = {
  feeding: UtensilsCrossed,
  vaccination: Syringe,
  deworming: Pill,
  vet: Stethoscope,
  health: HeartPulse,
  daily_summary: Sparkles,
};

function severityStyle(sev: AppNotification["severity"]) {
  if (sev === "critical") return { badge: "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300", icon: "bg-red-100 dark:bg-red-900/30 text-red-500" };
  if (sev === "warning") return { badge: "bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-300", icon: "bg-orange-100 dark:bg-orange-900/30 text-orange-500" };
  return { badge: "bg-[var(--coral-soft)] text-[var(--coral)]", icon: "bg-[var(--coral-soft)]" };
}

function NotificationCard({ notification, onDismiss }: { notification: AppNotification; onDismiss: () => void }) {
  const Icon = KIND_ICON[notification.kind];
  const style = severityStyle(notification.severity);
  return (
    <motion.div
      variants={slideUpVariants}
      layout
      exit={{ opacity: 0, x: 60, scale: 0.95, transition: { duration: 0.2 } }}
      className="bg-card rounded-2xl p-4 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.1)]"
    >
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${style.icon}`}>
          <Icon size={16} style={notification.severity === "info" ? { color: "var(--coral)" } : undefined} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold leading-tight">{notification.title}</p>
            <motion.button whileTap={{ scale: 0.8 }} onClick={onDismiss} className="text-muted-foreground shrink-0" aria-label="Dismiss">
              <X size={14} />
            </motion.button>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mt-1">{notification.body}</p>
          {notification.actionTo && (
            <Link to={notification.actionTo} className="inline-block mt-2 text-xs font-medium text-[var(--coral)] underline underline-offset-2">
              {notification.actionLabel}
            </Link>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function NotificationsPage() {
  const { user, dismissNotification } = useAuth();
  const cats = user?.cats ?? [];
  const activeCat = cats[0] ?? null;

  const allNotifications = useMemo(
    () => computeNotifications(user, activeCat),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, activeCat?.id]
  );

  const dismissed = user?.dismissedNotifications ?? [];
  const visible = allNotifications.filter((n) => !dismissed.includes(n.id));

  if (!activeCat) {
    return (
      <PhoneShell>
        <div className="px-6 pt-12 pb-4 flex items-center gap-3">
          <Link to="/" className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"><ArrowLeft size={18} /></Link>
          <h1 className="font-serif text-xl font-semibold flex-1 text-center pr-9">Notifications</h1>
        </div>
        <div className="px-6 py-16 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-[var(--coral-soft)] flex items-center justify-center mb-5"><PawPrint size={40} style={{ color: "var(--coral)" }} /></div>
          <h2 className="font-serif text-xl font-semibold mb-2">No cat added yet</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-[240px]">Add a cat to start receiving health and care reminders.</p>
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
          <h1 className="font-serif text-xl font-semibold flex-1 text-center pr-9">Notifications</h1>
        </motion.div>

        <div className="px-6 space-y-3 pb-8">
          <motion.div variants={staggerContainer} initial="hidden" animate="visible">
            <AnimatePresence mode="popLayout">
              {visible.length === 0 ? (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex flex-col items-center text-center py-16">
                  <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                    <BellOff size={26} className="text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">You're all caught up</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
                    No pending reminders or alerts for {activeCat.name} right now.
                  </p>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {visible.map((n) => (
                    <NotificationCard key={n.id} notification={n} onDismiss={() => dismissNotification(n.id)} />
                  ))}
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </motion.div>
    </PhoneShell>
  );
}
