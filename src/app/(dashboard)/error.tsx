"use client";

import { CircleAlert, RefreshCw } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useLanguage();

  return (
    <div className="card grid min-h-[60vh] place-items-center p-8 text-center">
      <div>
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950">
          <CircleAlert size={25} />
        </span>
        <h1 className="mt-5 text-xl font-bold">{t("error.title")}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 muted">{t("error.subtitle")}</p>
        <button onClick={reset} className="btn-primary mt-5">
          <RefreshCw size={16} /> {t("error.retryBtn")}
        </button>
      </div>
    </div>
  );
}
