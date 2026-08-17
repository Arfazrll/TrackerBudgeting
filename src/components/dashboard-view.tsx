"use client";

import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  CircleDollarSign,
  Lightbulb,
  PiggyBank,
  Plus,
  ReceiptText,
  Share2,
  Target,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CashflowChart } from "@/components/cashflow-chart";
import { useLanguage } from "@/contexts/language-context";
import { formatCurrency, formatDate } from "@/lib/format";

type MonthlyPoint = { date: string; income: number; expense: number };
type RecentTransaction = {
  id: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  description: string | null;
  date: string;
  categoryName: string | null;
  bookName: string;
  bookId: string;
  bookCurrency: string;
  bookType: "PERSONAL" | "SHARED";
};
type BudgetHealth = {
  id: string;
  name: string;
  bookName: string;
  bookId: string;
  currency: string;
  amount: number;
  spent: number;
  alertAt: number;
};
type PlanProgress = {
  id: string;
  title: string;
  currency: string;
  currentAmount: number;
  targetAmount: number;
};
type Recommendation = {
  key: string;
  href: string;
  tone: "warning" | "positive" | "neutral";
};
type Feature = "BOOKS" | "BUDGETING" | "PLANNING" | "POCKETS" | "NOTES";
type TransactionBook = {
  id: string;
  name: string;
  type: "PERSONAL" | "SHARED";
  currency: string;
};

const recommendationStyles = {
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-950/45 dark:text-amber-300",
  positive: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-300",
  neutral: "bg-blue-50 text-blue-700 dark:bg-blue-950/45 dark:text-blue-300",
};

export function DashboardView({
  userName,
  features,
  currency,
  personalBalance,
  sharedBalance,
  pocketBalance,
  savingsRate,
  personalBookCount,
  sharedBookCount,
  personalMonthly,
  sharedMonthly,
  budgets,
  plans,
  recommendations,
  recentTransactions,
  transactionBooks,
}: {
  userName: string;
  features: Feature[];
  currency: string;
  personalBalance: number;
  sharedBalance: number;
  pocketBalance: number;
  savingsRate: number;
  personalBookCount: number;
  sharedBookCount: number;
  personalMonthly: MonthlyPoint[];
  sharedMonthly: MonthlyPoint[];
  budgets: BudgetHealth[];
  plans: PlanProgress[];
  recommendations: Recommendation[];
  recentTransactions: RecentTransaction[];
  transactionBooks: TransactionBook[];
}) {
  const router = useRouter();
  const { locale, t } = useLanguage();
  const [bookChooser, setBookChooser] = useState<"PERSONAL" | "SHARED" | null>(null);
  const selectedBooks = transactionBooks.filter((book) => book.type === bookChooser);

  function startTransaction(type: "PERSONAL" | "SHARED") {
    const matchingBooks = transactionBooks.filter((book) => book.type === type);
    if (!matchingBooks.length) {
      router.push(type === "PERSONAL" ? "/books/personal" : "/books/shared");
      return;
    }
    router.push(`/quick-add?type=${type.toLowerCase()}`);
  }

  const cards = [
    {
      key: "enterprise.dashboard.personalBalance",
      value: formatCurrency(personalBalance, currency, locale),
      detail: t("enterprise.dashboard.bookCount", { count: personalBookCount }),
      icon: UserRound,
      tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
      feature: null,
    },
    {
      key: "enterprise.dashboard.sharedBalance",
      value: formatCurrency(sharedBalance, currency, locale),
      detail: t("enterprise.dashboard.bookCount", { count: sharedBookCount }),
      icon: Share2,
      tone: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
      feature: null,
    },
    {
      key: "enterprise.dashboard.pocketBalance",
      value: formatCurrency(pocketBalance, currency, locale),
      detail: t("enterprise.dashboard.reportingCurrency", { currency }),
      icon: PiggyBank,
      tone: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
      feature: "POCKETS" as const,
    },
    {
      key: "enterprise.dashboard.savingsRate",
      value: `${Math.round(savingsRate)}%`,
      detail: t("enterprise.dashboard.thisMonth"),
      icon: Wallet,
      tone: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
      feature: null,
    },
  ].filter((card) => !card.feature || features.includes(card.feature));

  return (
    <div className="space-y-6 sm:space-y-7">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{t("enterprise.dashboard.pageTag")}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-[-0.04em] sm:text-3xl">{t("dashboard.welcome", { name: userName.split(" ")[0] })}</h1>
          <p className="mt-1.5 max-w-3xl text-sm muted">{t("enterprise.dashboard.subtitle")}</p>
        </div>
        <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
          <button type="button" onClick={() => startTransaction("PERSONAL")} className="btn-primary min-h-11">
            <Plus size={17} /> {t("dashboard.addPersonalTransaction")}
          </button>
          <button type="button" onClick={() => startTransaction("SHARED")} className="btn-secondary min-h-11">
            <Share2 size={17} /> {t("dashboard.addSharedTransaction")}
          </button>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ key, value, detail, icon: Icon, tone }) => (
          <div key={key} className="card min-w-0 p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0"><p className="text-[0.7rem] font-medium leading-4 muted sm:text-xs">{t(key)}</p><p className="mt-2 truncate text-base font-bold tracking-tight sm:mt-3 sm:text-xl">{value}</p><p className="mt-1 truncate text-[0.67rem] muted">{detail}</p></div>
              <span className={`grid size-9 shrink-0 place-items-center rounded-xl sm:size-10 ${tone}`}><Icon size={18} /></span>
            </div>
          </div>
        ))}
      </section>

      <section className="grid min-w-0 gap-4 lg:grid-cols-2">
        <CashflowChart title={t("enterprise.dashboard.personalTrend")} data={personalMonthly} currency={currency} />
        <CashflowChart title={t("enterprise.dashboard.sharedTrend")} data={sharedMonthly} currency={currency} />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {features.includes("BUDGETING") && <div className="card p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div><h2 className="font-semibold">{t("enterprise.dashboard.budgetHealth")}</h2><p className="mt-0.5 text-xs muted">{t("enterprise.budgeting.subtitle")}</p></div>
            <CircleDollarSign className="text-emerald-600" size={19} />
          </div>
          <div className="mt-4 space-y-4">
            {budgets.length ? budgets.map((budget) => {
              const percent = Math.round((budget.spent / budget.amount) * 100);
              const warning = percent >= budget.alertAt;
              return (
                <Link key={budget.id} href={`/books/${budget.bookId}`} className="block rounded-xl border p-3 hover:bg-[var(--card-muted)]">
                  <div className="flex items-center justify-between gap-3 text-xs"><span className="min-w-0 truncate font-semibold">{budget.name}</span><span className={warning ? "font-bold text-amber-600 dark:text-amber-400" : "font-bold"}>{percent}%</span></div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--card-muted)]"><div className={`h-full rounded-full ${percent >= 100 ? "bg-red-500" : warning ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, percent)}%` }} /></div>
                  <div className="mt-2 flex justify-between gap-2 text-[0.67rem] muted"><span className="truncate">{budget.bookName}</span><span>{formatCurrency(budget.spent, budget.currency, locale)} / {formatCurrency(budget.amount, budget.currency, locale)}</span></div>
                </Link>
              );
            }) : <p className="py-12 text-center text-sm muted">{t("enterprise.budgeting.empty")}</p>}
          </div>
          <Link href="/budgeting" className="mt-4 flex min-h-10 items-center justify-between text-sm font-semibold text-emerald-600 hover:underline dark:text-emerald-400">{t("enterprise.dashboard.viewDetails")} <ArrowRight size={16} /></Link>
        </div>}

        {features.includes("PLANNING") && <div className="card p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div><h2 className="font-semibold">{t("enterprise.dashboard.planProgress")}</h2><p className="mt-0.5 text-xs muted">{t("enterprise.planning.subtitle")}</p></div>
            <Target className="text-emerald-600" size={19} />
          </div>
          <div className="mt-4 space-y-4">
            {plans.length ? plans.map((plan) => {
              const percent = Math.min(100, Math.round((plan.currentAmount / plan.targetAmount) * 100));
              return (
                <Link key={plan.id} href="/planning" className="block rounded-xl border p-3 hover:bg-[var(--card-muted)]">
                  <div className="flex items-center justify-between gap-3 text-xs"><span className="truncate font-semibold">{plan.title}</span><span className="font-bold">{percent}%</span></div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--card-muted)]"><div className="h-full rounded-full bg-violet-500" style={{ width: `${percent}%` }} /></div>
                  <p className="mt-2 text-[0.67rem] muted">{formatCurrency(plan.currentAmount, plan.currency, locale)} / {formatCurrency(plan.targetAmount, plan.currency, locale)}</p>
                </Link>
              );
            }) : <p className="py-12 text-center text-sm muted">{t("enterprise.dashboard.noPlans")}</p>}
          </div>
          <Link href="/planning" className="mt-4 flex min-h-10 items-center justify-between text-sm font-semibold text-emerald-600 hover:underline dark:text-emerald-400">{t("enterprise.dashboard.viewDetails")} <ArrowRight size={16} /></Link>
        </div>}

        <div className="card p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div><h2 className="font-semibold">{t("enterprise.dashboard.recommendations")}</h2><p className="mt-0.5 text-xs muted">{t("enterprise.dashboard.recommendationsSubtitle")}</p></div>
            <Lightbulb className="text-amber-500" size={19} />
          </div>
          <div className="mt-4 space-y-2.5">
            {recommendations.map((recommendation, index) => (
              <Link key={`${recommendation.key}-${index}`} href={recommendation.href} className={`flex min-h-16 items-center gap-3 rounded-xl p-3 text-xs font-medium leading-5 transition-transform active:scale-[0.98] ${recommendationStyles[recommendation.tone]}`}>
                {recommendation.tone === "warning" ? <AlertTriangle size={17} className="shrink-0" /> : recommendation.tone === "positive" ? <CheckCircle2 size={17} className="shrink-0" /> : <Lightbulb size={17} className="shrink-0" />}
                <span className="flex-1">{t(recommendation.key)}</span><ArrowRight size={15} className="shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between p-4 sm:p-5">
          <div><h2 className="font-semibold">{t("dashboard.recentTransactions")}</h2><p className="mt-0.5 text-xs muted">{t("dashboard.recentSubtitle")}</p></div>
          <Link href="/books/personal" className="text-xs font-semibold text-emerald-600 hover:underline dark:text-emerald-400">{t("dashboard.viewAll")}</Link>
        </div>
        {recentTransactions.length ? recentTransactions.map((transaction) => (
          <Link href={`/books/${transaction.bookId}`} key={transaction.id} className="flex items-center gap-3 border-t px-4 py-3 hover:bg-[var(--card-muted)] sm:px-5 sm:py-3.5">
            <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${transaction.type === "INCOME" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950" : "bg-orange-100 text-orange-700 dark:bg-orange-950"}`}><ReceiptText size={16} /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{transaction.description || transaction.categoryName || t("common.transactions")}</p>
              <p className="mt-0.5 truncate text-xs muted">{transaction.bookName} · {transaction.bookType === "SHARED" ? t("common.shared") : t("common.personal")} · {formatDate(transaction.date, locale)}</p>
            </div>
            <strong className={`shrink-0 text-xs sm:text-sm ${transaction.type === "INCOME" ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
              {transaction.type === "INCOME" ? <ArrowUpRight className="mr-0.5 inline" size={13} /> : <ArrowDownRight className="mr-0.5 inline" size={13} />}
              {formatCurrency(transaction.amount, transaction.bookCurrency, locale)}
            </strong>
          </Link>
        )) : <div className="grid h-44 place-items-center text-sm muted">{t("dashboard.noTransactions")}</div>}
      </section>

      {bookChooser && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="transaction-book-title" className="card max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-b-none p-5 shadow-2xl sm:rounded-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="transaction-book-title" className="text-lg font-bold sm:text-xl">
                  {t(bookChooser === "PERSONAL" ? "dashboard.choosePersonalBook" : "dashboard.chooseSharedBook")}
                </h2>
                <p className="mt-1 text-sm leading-6 muted">{t("dashboard.chooseBookSubtitle")}</p>
              </div>
              <button type="button" aria-label={t("common.close")} onClick={() => setBookChooser(null)} className="grid size-11 shrink-0 place-items-center rounded-lg hover:bg-[var(--card-muted)]">
                <X size={19} />
              </button>
            </div>
            <div className="mt-5 space-y-2">
              {selectedBooks.map((book) => (
                <Link
                  key={book.id}
                  href={`/quick-add?type=${book.type.toLowerCase()}`}
                  onClick={() => setBookChooser(null)}
                  className="flex min-h-16 items-center gap-3 rounded-xl border p-3 transition-colors hover:border-emerald-400 hover:bg-[var(--card-muted)]"
                >
                  <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${book.type === "SHARED" ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"}`}>
                    {book.type === "SHARED" ? <Share2 size={17} /> : <BookOpen size={17} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{book.name}</span>
                    <span className="mt-0.5 block text-xs muted">{book.currency}</span>
                  </span>
                  <ArrowRight className="shrink-0 muted" size={17} />
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
