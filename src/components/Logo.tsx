/**
 * CatTwin logo — two cats curled in a yin-yang circle.
 * Dark cat (navy) + cream cat, matching the brand logo.
 * Sizes: "sm" = 28px icon only, "md" = 36px icon + wordmark, "lg" = full stacked logo
 */

type LogoProps = {
  size?: "sm" | "md" | "lg";
  markOnly?: boolean;
  className?: string;
};

export function Logo({ size = "md", markOnly = false, className = "" }: LogoProps) {
  const dim = size === "sm" ? 28 : size === "md" ? 36 : 56;

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <CatTwinMark size={dim} />
      {!markOnly && (
        <div className={`flex flex-col leading-none ${size === "lg" ? "items-center" : ""}`}>
          <span
            className="font-serif font-semibold text-foreground tracking-tight"
            style={{ fontSize: size === "sm" ? 15 : size === "md" ? 18 : 26 }}
          >
            CatTwin
          </span>
          {size === "lg" && (
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-1 font-sans">
              Together, Purrfectly
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/** Just the circular twin-cats mark */
export function CatTwinMark({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="CatTwin logo"
      role="img"
    >
      {/* ── Dark cat (left, navy) ── */}
      <path
        d="M50 8 C28 8 10 26 10 50 C10 74 28 92 50 92 C50 92 50 70 50 50 C50 30 50 8 50 8 Z"
        fill="var(--nav-dark)"
      />
      <ellipse cx="34" cy="22" rx="12" ry="11" fill="var(--nav-dark)" />
      <polygon points="24,14 28,5 33,14" fill="var(--nav-dark)" />
      <polygon points="34,13 38,5 43,13" fill="var(--nav-dark)" />
      <ellipse cx="33" cy="21" rx="2.2" ry="2" fill="white" opacity="0.85" />
      <line x1="20" y1="24" x2="28" y2="23" stroke="white" strokeWidth="0.8" opacity="0.5" />
      <line x1="20" y1="26" x2="28" y2="26" stroke="white" strokeWidth="0.8" opacity="0.5" />
      <path
        d="M50 80 Q42 88 38 90 Q34 93 36 96 Q40 99 46 96 Q52 93 52 86 Z"
        fill="var(--nav-dark)"
      />

      {/* ── Cream cat (right, light) ── */}
      <path
        d="M50 8 C72 8 90 26 90 50 C90 74 72 92 50 92 C50 92 50 70 50 50 C50 30 50 8 50 8 Z"
        fill="oklch(0.92 0.02 60)"
        className="dark:opacity-90"
      />
      <ellipse cx="66" cy="22" rx="12" ry="11" fill="oklch(0.92 0.02 60)" />
      <polygon points="57,13 62,5 67,14" fill="oklch(0.92 0.02 60)" />
      <polygon points="67,13 72,5 76,14" fill="oklch(0.92 0.02 60)" />
      <ellipse cx="67" cy="21" rx="2.2" ry="2" fill="var(--nav-dark)" opacity="0.7" />
      <line x1="72" y1="24" x2="80" y2="23" stroke="var(--nav-dark)" strokeWidth="0.8" opacity="0.4" />
      <line x1="72" y1="26" x2="80" y2="26" stroke="var(--nav-dark)" strokeWidth="0.8" opacity="0.4" />
      <path
        d="M50 80 Q58 88 62 90 Q66 93 64 96 Q60 99 54 96 Q48 93 48 86 Z"
        fill="oklch(0.92 0.02 60)"
      />

      {/* Outer ring */}
      <circle cx="50" cy="50" r="41" stroke="var(--nav-dark)" strokeWidth="1.5" fill="none" opacity="0.15" />
    </svg>
  );
}
