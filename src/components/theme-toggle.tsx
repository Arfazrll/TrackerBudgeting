"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle({ inverse = false }: { inverse?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      suppressHydrationWarning
      type="button"
      aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className={`grid size-10 place-items-center rounded-xl ${
        inverse
          ? "text-emerald-100 hover:bg-white/10"
          : "border bg-[var(--card)] hover:bg-[var(--card-muted)]"
      }`}
    >
      {/* CSS controls visibility — no JS branching → no hydration mismatch */}
      <Sun size={18} className="hidden dark:block" />
      <Moon size={18} className="dark:hidden" />
    </button>
  );
}
