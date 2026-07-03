import type { ReactNode } from "react";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[oklch(0.94_0.02_20)] dark:bg-[oklch(0.15_0.005_260)] flex justify-center transition-colors duration-200">
      <div className="relative w-full max-w-[420px] min-h-screen bg-background flex flex-col">
        {children}
      </div>
    </div>
  );
}
