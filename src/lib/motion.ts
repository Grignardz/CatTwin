/**
 * Shared Framer Motion variants & transitions for CatTwin AI.
 * Import from here so every page uses identical curves.
 */

// ── Easing presets ────────────────────────────────────────────────────────────
export const ease = {
  smooth: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
  spring: { type: "spring", stiffness: 400, damping: 30 },
  springGentle: { type: "spring", stiffness: 260, damping: 28 },
  springBounce: { type: "spring", stiffness: 500, damping: 22 },
  exit: { duration: 0.18, ease: [0.4, 0, 1, 0.6] as [number, number, number, number] },
} as const;

// ── Page / shell entrance ─────────────────────────────────────────────────────
export const pageVariants = {
  hidden:  { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0,  transition: { ...ease.springGentle, staggerChildren: 0.07, delayChildren: 0.05 } },
  exit:    { opacity: 0, y: -10, transition: ease.exit },
};

// ── Auth page entrance (slides up from slightly lower) ────────────────────────
export const authPageVariants = {
  hidden:  { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0,  transition: { ...ease.springGentle, staggerChildren: 0.08, delayChildren: 0.04 } },
  exit:    { opacity: 0, y: -8, transition: ease.exit },
};

// ── Generic child (used as direct child of stagger parent) ────────────────────
export const childVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0,  transition: ease.springGentle },
};

// ── Fade + scale (cards, modals) ──────────────────────────────────────────────
export const cardVariants = {
  hidden:  { opacity: 0, scale: 0.97, y: 12 },
  visible: { opacity: 1, scale: 1,    y: 0,  transition: ease.springGentle },
};

// ── Slide up (used for list items, alert banners) ─────────────────────────────
export const slideUpVariants = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0,  transition: ease.spring },
  exit:    { opacity: 0, y: -8, transition: ease.exit },
};

// ── Stagger container ─────────────────────────────────────────────────────────
export const staggerContainer = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

// ── Fade only (subtle) ────────────────────────────────────────────────────────
export const fadeVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25, ease: ease.smooth } },
  exit:    { opacity: 0, transition: { duration: 0.15 } },
};

// ── Scale pop (buttons on press, badges) ─────────────────────────────────────
export const tapScale = { scale: 0.95, transition: ease.springBounce };

// ── Slide in from right (drawer / details panel) ─────────────────────────────
export const slideRightVariants = {
  hidden:  { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0,  transition: ease.springGentle },
  exit:    { opacity: 0, x: -16, transition: ease.exit },
};

// ── Logo bounce on mount ──────────────────────────────────────────────────────
export const logoBounce = {
  hidden:  { opacity: 0, scale: 0.7, rotate: -8 },
  visible: { opacity: 1, scale: 1,   rotate: 0,
    transition: { type: "spring", stiffness: 500, damping: 18, delay: 0.1 } },
};

// ── Number count-up helper (not a variant — used for animate prop) ────────────
export const countUp = (from: number, to: number) => ({
  from,
  to,
  transition: { duration: 0.6, ease: ease.smooth },
});
