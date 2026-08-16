"use client";

import { AuthForm } from "@/components/auth-form";
import { ShieldCheck } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

export function AuthPageContent({ mode, googleEnabled }: { mode: "login" | "register"; googleEnabled: boolean }) {
  const { t } = useLanguage();
  const isLogin = mode === "login";

  return (
    <>
      <p className="mb-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
        {t(isLogin ? "auth.loginHero" : "auth.registerHero")}
      </p>
      <h2 className="text-3xl font-bold tracking-[-0.035em]">{t(isLogin ? "auth.loginTitle" : "auth.registerTitle")}</h2>
      <p className="mt-2 text-sm leading-6 muted">{t(isLogin ? "auth.loginSubtitle" : "auth.registerSubtitle")}</p>
      <AuthForm mode={mode} googleEnabled={googleEnabled} />
      {isLogin && (
        <div className="mt-6 flex gap-3 rounded-xl border bg-[var(--card-muted)] p-4 text-xs leading-5 muted">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-emerald-600" />
          <div>
            <p className="font-semibold text-[var(--foreground)]">{t("auth.administratorAccess")}</p>
            <p className="mt-1"><strong>admin@ianda.local</strong> / <strong>Admin123!</strong></p>
          </div>
        </div>
      )}
    </>
  );
}
