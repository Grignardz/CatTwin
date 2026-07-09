import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export function PhoneShell({
  children,
  fullHeight = false,
}: {
  children: ReactNode;
  /**
   * When true, the shell locks to exactly the viewport height instead of
   * growing with content, and removes the bottom padding that normally
   * clears the BottomNav. Use this for pages that manage their own
   * internal scroll region (e.g. chat) so a fixed-position element like an
   * input bar can sit at the bottom of a flex column instead of being
   * `position: fixed` to the viewport, where it would overlap content
   * whenever the user scrolls.
   */
  fullHeight?: boolean;
}) {
  return (
    <div className="min-h-screen bg-[oklch(0.94_0.02_20)] dark:bg-black flex justify-center transition-colors duration-200">
      <div
        className={
          fullHeight
            ? "relative w-full max-w-[420px] h-screen bg-background flex flex-col overflow-hidden border-x border-border"
            : "relative w-full max-w-[420px] min-h-screen bg-background pb-28 border-x border-border"
        }
      >
        {children}
        <BottomNav />
      </div>
    </div>
  );
}
