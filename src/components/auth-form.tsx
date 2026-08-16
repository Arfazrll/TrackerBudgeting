"use client";

import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/language-context";

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[1.1rem]">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.55h3.24c1.9-1.75 2.98-4.32 2.98-7.42Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.63-2.35l-3.24-2.55c-.9.6-2.05.96-3.39.96-2.6 0-4.81-1.76-5.6-4.13H3.05v2.63A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.4 13.93A6 6 0 0 1 6.08 12c0-.67.12-1.32.32-1.93V7.44H3.05A10 10 0 0 0 2 12c0 1.64.39 3.2 1.05 4.56l3.35-2.63Z" />
      <path fill="#EA4335" d="M12 5.94c1.47 0 2.79.5 3.82 1.49l2.88-2.88A9.65 9.65 0 0 0 12 2a10 10 0 0 0-8.95 5.44l3.35 2.63c.79-2.37 3-4.13 5.6-4.13Z" />
    </svg>
  );
}

export function AuthForm({ mode, googleEnabled }: { mode: "login" | "register"; googleEnabled: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const reason = mode === "login" ? searchParams.get("reason") : null;
  const warningKey = reason === "pending"
    ? "auth.pendingError"
    : reason === "rejected"
      ? "auth.rejectedError"
      : reason === "suspended"
        ? "auth.suspendedError"
        : reason === "inactive"
          ? "auth.inactiveWarning"
          : null;
  const oauthFailed = mode === "login" && searchParams.has("error");

  async function continueWithGoogle() {
    if (!googleEnabled) {
      toast.error(t("auth.googleNotConfigured"));
      return;
    }
    setGoogleLoading(true);
    try {
      await signIn("google", { redirectTo: "/dashboard" });
    } catch {
      toast.error(t("auth.googleFailed"));
      setGoogleLoading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const data = Object.fromEntries(new FormData(event.currentTarget));

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? t("api.serverError"));

      if (mode === "register") {
        toast.success(t("auth.registerSuccess"));
        router.push("/login?registered=1");
      } else {
        toast.success(t("auth.welcomeBack"));
        router.push(payload.user.role === "ADMIN" ? "/admin" : "/dashboard");
        router.refresh();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("api.serverError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8">
      {warningKey && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          {t(warningKey)}
        </div>
      )}
      {oauthFailed && (
        <div className="mt-3 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {t("auth.googleFailed")}
        </div>
      )}

      <button type="button" onClick={continueWithGoogle} disabled={googleLoading || loading} className="btn-secondary mt-4 w-full border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900">
        {googleLoading ? <LoaderCircle className="animate-spin" size={18} /> : <GoogleIcon />}
        {t("auth.continueWithGoogle")}
      </button>
      {!googleEnabled && <p className="mt-2 text-center text-[0.7rem] text-amber-600 dark:text-amber-400">{t("auth.googleNotConfigured")}</p>}
      <div className="my-5 flex items-center gap-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] muted">
        <span className="h-px flex-1 bg-[var(--border)]" />
        {t("auth.orUseEmail")}
        <span className="h-px flex-1 bg-[var(--border)]" />
      </div>

      <form onSubmit={submit} className="space-y-5">
        {mode === "register" && (
          <div>
            <label className="label" htmlFor="name">{t("auth.fullName")}</label>
            <input className="input" id="name" name="name" minLength={2} maxLength={80} required autoComplete="name" placeholder={t("auth.namePlaceholder")} />
          </div>
        )}
        <div>
          <label className="label" htmlFor="email">{t("auth.email")}</label>
          <input className="input" id="email" name="email" type="email" maxLength={160} required autoComplete="email" placeholder={t("auth.emailPlaceholder")} />
        </div>
        <div>
          <label className="label" htmlFor="password">{t("auth.password")}</label>
          <div className="relative">
            <input
              className="input pr-12"
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              minLength={mode === "register" ? 8 : 1}
              maxLength={72}
              required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder={mode === "register" ? t("auth.passwordPlaceholder") : t("auth.passwordLoginPlaceholder")}
            />
            <button type="button" aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")} onClick={() => setShowPassword((value) => !value)} className="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-lg muted hover:bg-[var(--card-muted)]">
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>
        <button className="btn-primary w-full" disabled={loading || googleLoading}>
          {loading ? <LoaderCircle className="animate-spin" size={18} /> : <>{mode === "login" ? t("auth.signIn") : t("auth.signUp")} <ArrowRight size={17} /></>}
        </button>
        <p className="text-center text-sm muted">
          {mode === "login" ? t("auth.noAccount") : t("auth.hasAccount")}{" "}
          <Link className="font-semibold text-emerald-600 hover:underline dark:text-emerald-400" href={mode === "login" ? "/register" : "/login"}>
            {mode === "login" ? t("auth.registerNow") : t("auth.signInLink")}
          </Link>
        </p>
      </form>
    </div>
  );
}
