"use client";

import { AlertTriangle, ArrowRight, CheckCircle2, CircleDollarSign, Gauge, XCircle } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/contexts/language-context";
import { formatCurrency, formatDate } from "@/lib/format";

type Budget = {
  id: string;
  name: string;
  amount: number;
  spent: number;
  alertAt: number;
  startDate: string;
  endDate: string;
  categoryName: string | null;
  book: { id: string; name: string; type: "PERSONAL" | "SHARED"; currency: string };
};

function healthFor(budget: Budget) {
  const percent = budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;
  if (percent >= 100) return "exceeded" as const;
  if (percent >= budget.alertAt) return "warning" as const;
  return "healthy" as const;
}

const healthStyles = {
  healthy: { icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500", panel: "bg-emerald-50 dark:bg-emerald-950/40" },
  warning: { icon: AlertTriangle, color: "text-amber-600 dark:text-amber-400", bar: "bg-amber-500", panel: "bg-amber-50 dark:bg-amber-950/40" },
  exceeded: { icon: XCircle, color: "text-red-600 dark:text-red-400", bar: "bg-red-500", panel: "bg-red-50 dark:bg-red-950/40" },
};

export function BudgetingOverview({ budgets }: { budgets: Budget[] }) {
  const { locale, t } = useLanguage();
  const counts = {
    healthy: budgets.filter((budget) => healthFor(budget) === "healthy").length,
    warning: budgets.filter((budget) => healthFor(budget) === "warning").length,
    exceeded: budgets.filter((budget) => healthFor(budget) === "exceeded").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{t("enterprise.budgeting.tag")}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-[-0.04em] sm:text-3xl">{t("enterprise.budgeting.title")}</h1>
        <p className="mt-2 text-sm muted">{t("enterprise.budgeting.subtitle")}</p>
      </div>

      <section className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-3">
        {(["healthy", "warning", "exceeded"] as const).map((health) => {
          const Icon = healthStyles[health].icon;
          return (
            <div key={health} className="card p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <span className={`grid size-9 place-items-center rounded-xl ${healthStyles[health].panel} ${healthStyles[health].color}`}><Icon size={17} /></span>
                <div><p className="text-xs muted">{t(`enterprise.budgeting.${health}`)}</p><p className="mt-0.5 text-xl font-bold">{counts[health]}</p></div>
              </div>
            </div>
          );
        })}
      </section>

      {budgets.length ? (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {budgets.map((budget) => {
            const health = healthFor(budget);
            const style = healthStyles[health];
            const Icon = style.icon;
            const percent = Math.round((budget.spent / budget.amount) * 100);
            return (
              <article key={budget.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className={`grid size-11 place-items-center rounded-xl ${style.panel} ${style.color}`}><Gauge size={20} /></span>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.67rem] font-bold ${style.panel} ${style.color}`}><Icon size={12} /> {t(`enterprise.budgeting.${health}`)}</span>
                </div>
                <h2 className="mt-4 text-base font-bold">{budget.name}</h2>
                <p className="mt-1 text-xs muted">{budget.book.name} · {budget.book.type === "SHARED" ? t("common.shared") : t("common.personal")}</p>
                <div className="mt-5">
                  <div className="flex items-end justify-between gap-3">
                    <div><p className="text-xs muted">{t("enterprise.budgeting.spent")}</p><p className="mt-1 font-bold">{formatCurrency(budget.spent, budget.book.currency, locale)}</p></div>
                    <p className={`text-sm font-bold ${style.color}`}>{percent}%</p>
                  </div>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[var(--card-muted)]"><div className={`h-full rounded-full ${style.bar}`} style={{ width: `${Math.min(100, percent)}%` }} /></div>
                  <div className="mt-2 flex justify-between text-xs muted">
                    <span>{t("enterprise.budgeting.remaining")}: {formatCurrency(Math.max(0, budget.amount - budget.spent), budget.book.currency, locale)}</span>
                    <span>{t("enterprise.budgeting.limit")}: {formatCurrency(budget.amount, budget.book.currency, locale)}</span>
                  </div>
                </div>
                <div className="mt-4 rounded-xl bg-[var(--card-muted)] p-3 text-xs leading-5 muted">
                  <p>{budget.categoryName ?? t("book.budgets.allCategories")}</p>
                  <p>{formatDate(budget.startDate, locale)} - {formatDate(budget.endDate, locale)}</p>
                </div>
                <Link href={`/books/${budget.book.id}`} className="mt-4 flex min-h-10 items-center justify-between rounded-xl text-sm font-semibold text-emerald-600 hover:underline dark:text-emerald-400">
                  {t("enterprise.budgeting.openBook")} <ArrowRight size={16} />
                </Link>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="card grid min-h-72 place-items-center p-8 text-center">
          <div><CircleDollarSign className="mx-auto muted" size={36} /><p className="mt-3 text-sm muted">{t("enterprise.budgeting.empty")}</p><Link href="/books" className="btn-primary mt-5">{t("nav.books")} <ArrowRight size={16} /></Link></div>
        </div>
      )}
    </div>
  );
}
