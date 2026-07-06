import { X, Download } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { CatTwinMark } from "./Logo";
import { useInstallPrompt } from "@/lib/installPrompt";
import { tapScale } from "@/lib/motion";

/** Occasional "Install CatTwin as an app" popup, driven by the native beforeinstallprompt event. */
export function InstallPrompt() {
  const { visible, install, dismiss } = useInstallPrompt();

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] w-[92%] max-w-[380px]"
          role="dialog"
          aria-label="Install CatTwin"
        >
          <div className="bg-card border border-border rounded-3xl p-4 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.35)] flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[var(--coral-soft)] flex items-center justify-center shrink-0 overflow-hidden">
              <CatTwinMark size={28} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Install CatTwin</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Add it to your home screen for quicker access and a full-screen experience.
              </p>
              <div className="flex gap-2 mt-3">
                <motion.button
                  whileTap={tapScale}
                  onClick={install}
                  className="flex items-center gap-1.5 bg-[var(--nav-dark)] hover:bg-[var(--coral)] text-white text-xs font-medium rounded-full px-3.5 py-2 transition-colors"
                >
                  <Download size={13} /> Install
                </motion.button>
                <motion.button
                  whileTap={tapScale}
                  onClick={dismiss}
                  className="text-xs font-medium text-muted-foreground rounded-full px-3.5 py-2 hover:bg-secondary transition-colors"
                >
                  Not now
                </motion.button>
              </div>
            </div>
            <button
              onClick={dismiss}
              className="text-muted-foreground shrink-0"
              aria-label="Dismiss"
            >
              <X size={15} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
