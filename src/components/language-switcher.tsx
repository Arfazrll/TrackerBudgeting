"use client";

import { useLanguage } from "@/contexts/language-context";

export function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();

  return (
    <div className="flex items-center gap-0.5 rounded-xl border bg-[var(--card)] p-1">
      {(["en", "id"] as const).map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => setLocale(value)}
          className={`rounded-lg px-2.5 py-1 text-[0.7rem] font-bold uppercase transition-colors ${
            locale === value ? "bg-emerald-500 text-white dark:text-emerald-950" : "muted hover:text-[var(--foreground)]"
          }`}
        >
          {value}
        </button>
      ))}
    </div>
  );
}
