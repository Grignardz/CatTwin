/**
 * "Install as app" prompt logic.
 *
 * Wraps the browser's native `beforeinstallprompt` event (Chrome, Edge,
 * Android) behind a small hook that shows an in-app popup occasionally
 * rather than nagging on every load:
 *  - Waits a bit after the event fires before showing anything (so it
 *    doesn't interrupt the very first page load).
 *  - If dismissed, stays quiet for a cooldown period before it's eligible
 *    to show again.
 *  - Never shows once the app is actually installed / running standalone.
 *
 * iOS Safari doesn't fire `beforeinstallprompt` at all — there's no native
 * hook for it, so this component simply never appears there. That's a
 * platform limitation, not a bug in this implementation.
 */
import { useCallback, useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

const STORAGE_KEY = "cattwin_install_prompt";
const SHOW_DELAY_MS = 8_000; // wait after capture before showing, so it's not an instant interruption
const SNOOZE_DAYS = 7; // how long to stay quiet after "Not now"

interface PromptState {
  lastDismissedAt?: string; // ISO
  installed?: boolean;
}

function readState(): PromptState {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}
function writeState(state: PromptState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore storage errors (private mode, quota, etc.) */
  }
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mediaStandalone = window.matchMedia?.("(display-mode: standalone)").matches;
  const iosStandalone = (window.navigator as { standalone?: boolean }).standalone === true;
  return Boolean(mediaStandalone || iosStandalone);
}

function isSnoozed(): boolean {
  const { lastDismissedAt } = readState();
  if (!lastDismissedAt) return false;
  const elapsedDays = (Date.now() - new Date(lastDismissedAt).getTime()) / (1000 * 60 * 60 * 24);
  return elapsedDays < SNOOZE_DAYS;
}

export function useInstallPrompt() {
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || readState().installed) return;

    let showTimer: ReturnType<typeof setTimeout> | undefined;

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      if (isSnoozed()) return;
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredEvent(promptEvent);
      showTimer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    }

    function handleInstalled() {
      writeState({ ...readState(), installed: true });
      setVisible(false);
      setDeferredEvent(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      if (showTimer) clearTimeout(showTimer);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredEvent) return;
    setVisible(false);
    await deferredEvent.prompt();
    const choice = await deferredEvent.userChoice;
    if (choice.outcome === "accepted") {
      writeState({ ...readState(), installed: true });
    } else {
      writeState({ ...readState(), lastDismissedAt: new Date().toISOString() });
    }
    setDeferredEvent(null);
  }, [deferredEvent]);

  const dismiss = useCallback(() => {
    writeState({ ...readState(), lastDismissedAt: new Date().toISOString() });
    setVisible(false);
  }, []);

  return { visible, install, dismiss };
}
