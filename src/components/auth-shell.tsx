"use client";

import { BadgeCheck, BarChart3, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/brand";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { useLanguage } from "@/contexts/language-context";

export function AuthShell({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const benefits = [
    { icon: BarChart3, title: t("auth.benefit1Title"), text: t("auth.benefit1Text") },
    { icon: ShieldCheck, title: t("auth.benefit2Title"), text: t("auth.benefit2Text") },
    { icon: BadgeCheck, title: t("auth.benefit3Title"), text: t("auth.benefit3Text") },
  ];

  return (
    <main className="grid min-h-dvh bg-[var(--background)] lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden border-r bg-[var(--sidebar)] p-10 xl:p-12 lg:flex lg:flex-col">
        <div className="relative"><Brand /></div>
        <div className="relative my-auto max-w-xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">{t("auth.heroTagline")}</p>
          <h1 className="text-5xl font-semibold leading-[1.12] tracking-[-0.045em] text-[var(--foreground)]">{t("auth.heroHeadline")}</h1>
          <div className="mt-10 space-y-6">
            {benefits.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--primary-soft)] text-emerald-600 dark:text-emerald-400"><Icon size={20} /></span>
                <div><p className="font-semibold text-[var(--foreground)]">{title}</p><p className="mt-1 text-sm leading-6 muted">{text}</p></div>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs muted">{t("auth.footerBrand")}</p>
      </section>
      <section className="flex min-h-dvh min-w-0 flex-col px-4 py-4 sm:px-8 sm:py-6 lg:px-10">
        <header className="flex min-h-11 items-center justify-between gap-3 lg:justify-end">
          <div className="lg:hidden"><Brand /></div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </header>
        <div className="mx-auto my-6 w-full max-w-md rounded-3xl border bg-[var(--card)] p-5 shadow-sm sm:my-auto sm:p-8 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">{children}</div>
      </section>
    </main>
  );
}
