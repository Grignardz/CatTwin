/**
 * CatTwin logo — renders the brand mark image (public/icons/icon-512.png),
 * the same artwork used for the app icon and home-screen install.
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

export function CatTwinMark({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <img
      src="/logo2.png"
      width={size}
      height={size}
      className={`rounded-xl object-cover ${className}`}
      alt="CatTwin logo"
    />
  );
}
