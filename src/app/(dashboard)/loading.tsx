"use client";

import { useLanguage } from "@/contexts/language-context";

export default function Loading() {
  const { t } = useLanguage();

  return (
    <div className="animate-pulse space-y-6">
      <div>
        <div className="h-8 w-64 rounded-lg bg-[var(--border)]" />
        <p className="mt-3 text-sm muted">{t("loading.text")}</p>
      </div>
      <div className="h-4 w-96 max-w-full rounded bg-[var(--border)]" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-32 rounded-2xl bg-[var(--border)]" />)}
      </div>
      <div className="h-96 rounded-2xl bg-[var(--border)]" />
    </div>
  );
}
