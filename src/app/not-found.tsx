"use client";

import { BookX } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/contexts/language-context";

export default function NotFound() {
  const { t } = useLanguage();

  return (
    <main className="grid min-h-screen place-items-center p-6 text-center">
      <div>
        <BookX className="mx-auto text-emerald-600" size={48} />
        <p className="mt-5 text-sm font-semibold text-emerald-600">{t("notFound.code")}</p>
        <h1 className="mt-2 text-3xl font-bold">{t("notFound.title")}</h1>
        <p className="mt-2 text-sm muted">{t("notFound.subtitle")}</p>
        <Link href="/dashboard" className="btn-primary mt-6">{t("notFound.backBtn")}</Link>
      </div>
    </main>
  );
}
