"use client";

import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  BellRing,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  LoaderCircle,
  Pencil,
  PiggyBank,
  Plus,
  ReceiptText,
  Settings,
  Share2,
  Trash2,
  Users,
  WalletCards,
  X,
  BookOpen,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useDeferredValue, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/language-context";
import { SharedInviteControls } from "@/components/shared-invite-controls";
import { cn, formatCurrency, formatDate, initials } from "@/lib/format";
import { localeToIntl } from "@/lib/translations";

type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: "INCOME" | "EXPENSE" | "BOTH";
  _count: { transactions: number };
};
type Transaction = {
  id: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  description: string | null;
  date: string;
  dateKnown: boolean;
  originalDateText: string | null;
  accountingPeriodStart: string | null;
  accountingPeriodEnd: string | null;
  categoryId: string | null;
  category: Category | null;
  createdBy: { id: string; name: string };
};
type Budget = {
  id: string;
  name: string;
  amount: number;
  spent: number;
  period: "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
  alertAt: number;
  startDate: string;
  endDate: string;
  categoryId: string | null;
  category: Category | null;
};
type Book = {
  id: string;
  name: string;
  description: string | null;
  type: "PERSONAL" | "SHARED";
  currency: string;
  inviteCode: string | null;
  inviteCodeExpiresAt: string | null;
  ownerId: string;
  owner: { id: string; name: string; email: string };
  members: Array<{ id: string; role: "OWNER" | "MEMBER"; joinedAt: string; user: { id: string; name: string; email: string } }>;
};
type Tab = "overview" | "transactions" | "categories" | "budgets" | "history" | "members" | "settings";
type PeriodMode = "MONTH" | "CUSTOM" | "YEAR" | "ALL";
type SortMode = "DATE_DESC" | "DATE_ASC" | "AMOUNT_DESC" | "AMOUNT_ASC";
type DateRange = { start: Date; end: Date };

const categoryChartColors = ["#10b981", "#3b82f6", "#f97316", "#8b5cf6", "#ec4899", "#64748b"];

function todayInput(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function transactionDate(transaction: Transaction) {
  return new Date(transaction.date);
}

function reportingDate(transaction: Transaction) {
  if (transaction.accountingPeriodStart) return new Date(transaction.accountingPeriodStart);
  const date = transactionDate(transaction);
  return new Date(date.getFullYear(), date.getMonth() - (date.getDate() < 25 ? 1 : 0), 25);
}

function displayTransactionDate(transaction: Transaction, locale: Parameters<typeof formatDate>[1], unknownLabel: string) {
  if (transaction.originalDateText && !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(transaction.originalDateText)) {
    return transaction.originalDateText;
  }
  if (!transaction.dateKnown) return unknownLabel;
  return formatDate(transaction.date, locale);
}

function compareTransactionDates(first: Transaction, second: Transaction, direction: "asc" | "desc") {
  if (first.dateKnown !== second.dateKnown) return first.dateKnown ? -1 : 1;
  const difference = transactionDate(first).getTime() - transactionDate(second).getTime();
  return direction === "asc" ? difference : -difference;
}

function matchesPeriod(transaction: Transaction, mode: PeriodMode, year: number, range: DateRange | null) {
  if (mode === "ALL") return true;
  if (mode === "YEAR") return reportingDate(transaction).getFullYear() === year;
  if (!range) return false;
  if (transaction.accountingPeriodStart && transaction.accountingPeriodEnd) {
    const start = new Date(transaction.accountingPeriodStart);
    const end = new Date(transaction.accountingPeriodEnd);
    return start >= range.start && end <= range.end;
  }
  const date = transactionDate(transaction);
  return date >= range.start && date <= range.end;
}

function periodBounds(mode: Exclude<PeriodMode, "CUSTOM">, year: number, month: number): DateRange | null {
  if (mode === "ALL") return null;
  if (mode === "YEAR") {
    return { start: new Date(year, 0, 1), end: new Date(year, 11, 31, 23, 59, 59, 999) };
  }
  return { start: new Date(year, month, 25), end: new Date(year, month + 1, 24, 23, 59, 59, 999) };
}

function customPeriodBounds(startValue: string, endValue: string): DateRange | null {
  if (!startValue || !endValue) return null;
  const start = new Date(`${startValue}T00:00:00`);
  const end = new Date(`${endValue}T23:59:59.999`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return null;
  return { start, end };
}

function Modal({ title, description, close, children }: { title: string; description: string; close: () => void; children: React.ReactNode }) {
  const { t } = useLanguage();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4">
      <div className="card max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-b-none p-5 shadow-2xl sm:rounded-2xl sm:p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold sm:text-xl">{title}</h2>
            <p className="mt-1 text-sm muted">{description}</p>
          </div>
          <button aria-label={t("common.close")} onClick={close} className="grid size-9 place-items-center rounded-lg hover:bg-[var(--card-muted)]"><X size={19} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function BookWorkspace({
  initialBook,
  initialCategories,
  initialTransactions,
  initialBudgets,
  userId,
  budgetingEnabled,
  openTransactionOnLoad = false,
}: {
  initialBook: Book;
  initialCategories: Category[];
  initialTransactions: Transaction[];
  initialBudgets: Budget[];
  userId: string;
  budgetingEnabled: boolean;
  openTransactionOnLoad?: boolean;
}) {
  const router = useRouter();
  const { locale, t } = useLanguage();
  const [book, setBook] = useState(initialBook);
  const [categories, setCategories] = useState(initialCategories);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [budgets, setBudgets] = useState(initialBudgets);
  const [tab, setTab] = useState<Tab>("overview");
  const [modal, setModal] = useState<"transaction" | "category" | "budget" | null>(openTransactionOnLoad ? "transaction" : null);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [typeFilter, setTypeFilter] = useState("ALL");
  const latestTransactionDate = useMemo(
    () => initialTransactions.reduce<Date>((latest, transaction) => {
      const date = reportingDate(transaction);
      return date > latest ? date : latest;
    }, initialTransactions.length ? reportingDate(initialTransactions[0]) : new Date()),
    [initialTransactions],
  );
  const [periodMode, setPeriodMode] = useState<PeriodMode>("MONTH");
  const [selectedYear, setSelectedYear] = useState(latestTransactionDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(latestTransactionDate.getMonth());
  const initialPeriodBounds = periodBounds("MONTH", latestTransactionDate.getFullYear(), latestTransactionDate.getMonth())!;
  const [customStart, setCustomStart] = useState(todayInput(initialPeriodBounds.start));
  const [customEnd, setCustomEnd] = useState(todayInput(initialPeriodBounds.end));
  const [sortMode, setSortMode] = useState<SortMode>("DATE_DESC");
  const [transactionPage, setTransactionPage] = useState(1);
  const [historyMonths, setHistoryMonths] = useState(3);
  const currency = book.currency;
  const tabs = [
    { id: "overview" as const, label: t("workspace.tabs.overview"), icon: BarChart3 },
    { id: "transactions" as const, label: t("workspace.tabs.transactions"), icon: ReceiptText },
    { id: "categories" as const, label: t("workspace.tabs.categories"), icon: FolderOpen },
    ...(budgetingEnabled ? [{ id: "budgets" as const, label: t("workspace.tabs.budgets"), icon: PiggyBank }] : []),
    { id: "history" as const, label: t("workspace.tabs.history"), icon: CalendarDays },
    { id: "members" as const, label: t("workspace.tabs.members"), icon: Users },
    { id: "settings" as const, label: t("workspace.tabs.settings"), icon: Settings },
  ];

  const availableYears = useMemo(() => {
    const years = new Set<number>([new Date().getFullYear(), selectedYear]);
    transactions.forEach((transaction) => years.add(reportingDate(transaction).getFullYear()));
    budgets.forEach((budget) => {
      years.add(new Date(budget.startDate).getFullYear());
      years.add(new Date(budget.endDate).getFullYear());
    });
    return [...years].sort((first, second) => second - first);
  }, [budgets, selectedYear, transactions]);

  const monthOptions = useMemo(
    () => Array.from({ length: 12 }, (_, month) => ({
      value: month,
      label: new Intl.DateTimeFormat(localeToIntl(locale), { month: "long" }).format(new Date(2026, month, 1)),
    })),
    [locale],
  );
  const accountingPeriodOptions = useMemo(
    () => Array.from({ length: 12 }, (_, month) => {
      const bounds = periodBounds("MONTH", selectedYear, month)!;
      const start = new Intl.DateTimeFormat(localeToIntl(locale), { day: "numeric", month: "short" }).format(bounds.start);
      const end = new Intl.DateTimeFormat(localeToIntl(locale), { day: "numeric", month: "short", year: "numeric" }).format(bounds.end);
      return { value: month, label: `${start} – ${end}` };
    }),
    [locale, selectedYear],
  );

  const selectedPeriodBounds = useMemo(() => (
    periodMode === "CUSTOM"
      ? customPeriodBounds(customStart, customEnd)
      : periodBounds(periodMode, selectedYear, selectedMonth)
  ), [customEnd, customStart, periodMode, selectedMonth, selectedYear]);
  const periodTransactions = useMemo(
    () => transactions.filter((transaction) => matchesPeriod(transaction, periodMode, selectedYear, selectedPeriodBounds)),
    [periodMode, selectedPeriodBounds, selectedYear, transactions],
  );

  const totals = useMemo(() => {
    const income = periodTransactions.filter((tx) => tx.type === "INCOME").reduce((sum, tx) => sum + tx.amount, 0);
    const expense = periodTransactions.filter((tx) => tx.type === "EXPENSE").reduce((sum, tx) => sum + tx.amount, 0);
    return { income, expense, balance: income - expense };
  }, [periodTransactions]);

  const filteredTransactions = useMemo(() => periodTransactions
    .filter((transaction) => {
      const matchesText = `${transaction.description ?? ""} ${transaction.category?.name ?? ""} ${transaction.createdBy.name}`.toLowerCase().includes(deferredSearch.toLowerCase());
      return matchesText && (typeFilter === "ALL" || transaction.type === typeFilter);
    })
    .sort((first, second) => {
      if (sortMode === "AMOUNT_DESC") return second.amount - first.amount;
      if (sortMode === "AMOUNT_ASC") return first.amount - second.amount;
      return compareTransactionDates(first, second, sortMode === "DATE_ASC" ? "asc" : "desc");
    }), [deferredSearch, periodTransactions, sortMode, typeFilter]);

  const transactionPageSize = 25;
  const transactionPageCount = Math.max(1, Math.ceil(filteredTransactions.length / transactionPageSize));
  const safeTransactionPage = Math.min(transactionPage, transactionPageCount);
  const visibleTransactions = filteredTransactions.slice(
    (safeTransactionPage - 1) * transactionPageSize,
    safeTransactionPage * transactionPageSize,
  );

  const visibleBudgets = useMemo(() => {
    if (periodMode === "ALL") return budgets;
    if (!selectedPeriodBounds) return [];
    return budgets.filter((budget) => new Date(budget.startDate) <= selectedPeriodBounds.end && new Date(budget.endDate) >= selectedPeriodBounds.start);
  }, [budgets, periodMode, selectedPeriodBounds]);

  const cashflowData = useMemo(() => {
    if ((periodMode === "MONTH" || periodMode === "CUSTOM") && selectedPeriodBounds) {
      const { start, end } = selectedPeriodBounds;
      const dayCount = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
      const datedPoints = Array.from({ length: dayCount }, (_, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        const items = periodTransactions.filter((transaction) => transaction.dateKnown && transactionDate(transaction).toDateString() === date.toDateString());
        return {
          label: new Intl.DateTimeFormat(localeToIntl(locale), { day: "numeric", month: "short" }).format(date),
          income: items.filter((transaction) => transaction.type === "INCOME").reduce((sum, transaction) => sum + transaction.amount, 0),
          expense: items.filter((transaction) => transaction.type === "EXPENSE").reduce((sum, transaction) => sum + transaction.amount, 0),
        };
      });
      return datedPoints;
    }
    if (periodMode === "YEAR") {
      return monthOptions.map((month) => {
        const items = periodTransactions.filter((transaction) => reportingDate(transaction).getMonth() === month.value);
        return {
          label: month.label.slice(0, 3),
          income: items.filter((transaction) => transaction.type === "INCOME").reduce((sum, transaction) => sum + transaction.amount, 0),
          expense: items.filter((transaction) => transaction.type === "EXPENSE").reduce((sum, transaction) => sum + transaction.amount, 0),
        };
      });
    }
    return [...availableYears].reverse().map((year) => {
      const items = periodTransactions.filter((transaction) => reportingDate(transaction).getFullYear() === year);
      return {
        label: String(year),
        income: items.filter((transaction) => transaction.type === "INCOME").reduce((sum, transaction) => sum + transaction.amount, 0),
        expense: items.filter((transaction) => transaction.type === "EXPENSE").reduce((sum, transaction) => sum + transaction.amount, 0),
      };
    });
  }, [availableYears, locale, monthOptions, periodMode, periodTransactions, selectedPeriodBounds]);

  const categoryData = useMemo(() => {
    const totalsByCategory = new Map<string, number>();
    periodTransactions
      .filter((transaction) => transaction.type === "EXPENSE")
      .forEach((transaction) => {
        const name = transaction.category?.name ?? t("workspace.transactions.noCategory");
        totalsByCategory.set(name, (totalsByCategory.get(name) ?? 0) + transaction.amount);
      });
    const sorted = [...totalsByCategory].map(([name, value]) => ({ name, value })).sort((first, second) => second.value - first.value);
    if (sorted.length <= 5) return sorted;
    return [...sorted.slice(0, 5), {
      name: t("workspace.overview.otherCategories"),
      value: sorted.slice(5).reduce((sum, item) => sum + item.value, 0),
    }];
  }, [periodTransactions, t]);

  const largestExpense = useMemo(
    () => periodTransactions.filter((transaction) => transaction.type === "EXPENSE").sort((first, second) => second.amount - first.amount)[0] ?? null,
    [periodTransactions],
  );
  const activeDays = useMemo(
    () => new Set(periodTransactions.filter((transaction) => transaction.dateKnown).map((transaction) => transaction.date.slice(0, 10))).size,
    [periodTransactions],
  );
  const undatedSummary = useMemo(() => {
    const items = periodTransactions.filter((transaction) => !transaction.dateKnown);
    return {
      count: items.length,
      income: items.filter((transaction) => transaction.type === "INCOME").reduce((sum, transaction) => sum + transaction.amount, 0),
      expense: items.filter((transaction) => transaction.type === "EXPENSE").reduce((sum, transaction) => sum + transaction.amount, 0),
    };
  }, [periodTransactions]);
  const recentPeriodTransactions = useMemo(
    () => [...periodTransactions].sort((first, second) => compareTransactionDates(first, second, "desc")),
    [periodTransactions],
  );
  const selectedPeriodLabel = periodMode === "ALL"
    ? t("workspace.overview.allTime")
    : periodMode === "YEAR"
      ? String(selectedYear)
      : selectedPeriodBounds
        ? `${formatDate(selectedPeriodBounds.start.toISOString(), locale)} – ${formatDate(selectedPeriodBounds.end.toISOString(), locale)}`
        : t("workspace.overview.invalidCustomPeriod");

  const chartData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: historyMonths }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - historyMonths + 1 + index, 1);
      const inMonth = transactions.filter((tx) => {
        const txDate = reportingDate(tx);
        return txDate.getMonth() === date.getMonth() && txDate.getFullYear() === date.getFullYear();
      });
      return {
        month: new Intl.DateTimeFormat(localeToIntl(locale), { month: "short", year: historyMonths > 6 ? "2-digit" : undefined }).format(date),
        income: inMonth.filter((tx) => tx.type === "INCOME").reduce((sum, tx) => sum + tx.amount, 0),
        expense: inMonth.filter((tx) => tx.type === "EXPENSE").reduce((sum, tx) => sum + tx.amount, 0),
      };
    });
  }, [transactions, historyMonths, locale]);

  function categoryTypeLabel(type: Category["type"]) {
    if (type === "BOTH") return t("workspace.categories.typeBoth");
    return type === "INCOME" ? t("common.income") : t("common.expense");
  }

  function moveReportingPeriod(offset: number) {
    if (periodMode === "CUSTOM" && selectedPeriodBounds) {
      const nextStart = new Date(selectedPeriodBounds.start);
      const nextEnd = new Date(selectedPeriodBounds.end);
      nextStart.setMonth(nextStart.getMonth() + offset);
      nextEnd.setMonth(nextEnd.getMonth() + offset);
      setCustomStart(todayInput(nextStart));
      setCustomEnd(todayInput(nextEnd));
    } else {
      const next = new Date(selectedYear, selectedMonth + offset, 1);
      setSelectedYear(next.getFullYear());
      setSelectedMonth(next.getMonth());
    }
    setTransactionPage(1);
  }

  function periodLabel(period: Budget["period"]) {
    return t(`workspace.budgets.periods.${period}`);
  }

  function openTransaction(transaction: Transaction | null = null) { setEditingTx(transaction); setModal("transaction"); }
  function openCategory(category: Category | null = null) { setEditingCategory(category); setModal("category"); }
  function openBudget(budget: Budget | null = null) { setEditingBudget(budget); setModal("budget"); }
  function closeModal() { setModal(null); setEditingTx(null); setEditingCategory(null); setEditingBudget(null); }

  async function api<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      ...options,
      headers: options?.body ? { "Content-Type": "application/json", ...options.headers } : options?.headers,
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? t("api.serverError"));
    return payload;
  }

  async function submitTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const raw = Object.fromEntries(new FormData(event.currentTarget));
    const { date: rawDate, ...fields } = raw;
    const date = String(rawDate ?? "");
    const originalDate = editingTx?.dateKnown ? editingTx.date.slice(0, 10) : "";
    const body = {
      ...fields,
      amount: Number(raw.amount),
      categoryId: raw.categoryId || null,
      ...(!editingTx || (date && date !== originalDate) ? { date } : {}),
    };
    try {
      const result = await api<{ transaction: Transaction }>(
        editingTx ? `/api/transactions/${editingTx.id}` : `/api/books/${book.id}/transactions`,
        { method: editingTx ? "PATCH" : "POST", body: JSON.stringify(body) },
      );
      setTransactions((items) => editingTx ? items.map((item) => item.id === editingTx.id ? result.transaction : item) : [result.transaction, ...items]);
      toast.success(t(editingTx ? "workspace.transactions.updateSuccess" : "workspace.transactions.addSuccess"));
      closeModal();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("workspace.transactions.saveFail"));
    } finally {
      setLoading(false);
    }
  }

  async function deleteTransaction(id: string) {
    if (!window.confirm(t("workspace.transactions.deleteConfirm"))) return;
    try {
      await api(`/api/transactions/${id}`, { method: "DELETE" });
      setTransactions((items) => items.filter((item) => item.id !== id));
      toast.success(t("workspace.transactions.deleteSuccess"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("workspace.transactions.deleteFail"));
    }
  }

  async function submitCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const body = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await api<{ category: Category }>(
        editingCategory ? `/api/categories/${editingCategory.id}` : `/api/books/${book.id}/categories`,
        { method: editingCategory ? "PATCH" : "POST", body: JSON.stringify(body) },
      );
      const category = { ...result.category, _count: result.category._count ?? editingCategory?._count ?? { transactions: 0 } };
      setCategories((items) => editingCategory ? items.map((item) => item.id === editingCategory.id ? category : item) : [...items, category]);
      toast.success(t("workspace.categories.saveSuccess"));
      closeModal();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("workspace.categories.saveFail"));
    } finally {
      setLoading(false);
    }
  }

  async function deleteCategory(id: string) {
    if (!window.confirm(t("workspace.categories.deleteConfirm"))) return;
    try {
      await api(`/api/categories/${id}`, { method: "DELETE" });
      setCategories((items) => items.filter((item) => item.id !== id));
      setTransactions((items) => items.map((item) => item.categoryId === id ? { ...item, categoryId: null, category: null } : item));
      toast.success(t("workspace.categories.deleteSuccess"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("workspace.categories.deleteFail"));
    }
  }

  async function submitBudget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const raw = Object.fromEntries(new FormData(event.currentTarget));
    const body = { ...raw, amount: Number(raw.amount), alertAt: Number(raw.alertAt), categoryId: raw.categoryId || null, startDate: String(raw.startDate), endDate: String(raw.endDate) };
    try {
      const result = await api<{ budget: Budget }>(
        editingBudget ? `/api/budgets/${editingBudget.id}` : `/api/books/${book.id}/budgets`,
        { method: editingBudget ? "PATCH" : "POST", body: JSON.stringify(body) },
      );
      const budget = { ...result.budget, spent: editingBudget?.spent ?? result.budget.spent ?? 0 };
      setBudgets((items) => editingBudget ? items.map((item) => item.id === editingBudget.id ? budget : item) : [budget, ...items]);
      toast.success(t("workspace.budgets.saveSuccess"));
      closeModal();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("workspace.budgets.saveFail"));
    } finally {
      setLoading(false);
    }
  }

  async function deleteBudget(id: string) {
    if (!window.confirm(t("workspace.budgets.deleteConfirm"))) return;
    try {
      await api(`/api/budgets/${id}`, { method: "DELETE" });
      setBudgets((items) => items.filter((item) => item.id !== id));
      toast.success(t("workspace.budgets.deleteSuccess"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("workspace.budgets.deleteFail"));
    }
  }

  async function updateBook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const body = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await api<{ book: Book }>(`/api/books/${book.id}`, { method: "PATCH", body: JSON.stringify(body) });
      setBook((value) => ({ ...value, ...result.book }));
      toast.success(t("workspace.settings.saveSuccess"));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("workspace.settings.saveFail"));
    } finally {
      setLoading(false);
    }
  }

  async function deleteBook() {
    if (!window.confirm(t("workspace.settings.deleteConfirm", { name: book.name }))) return;
    try {
      await api(`/api/books/${book.id}`, { method: "DELETE" });
      toast.success(t("workspace.settings.deleteSuccess"));
      router.push("/books");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("workspace.settings.deleteFail"));
    }
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <Link href="/books" className="mb-3 inline-flex items-center gap-2 text-sm font-medium muted hover:text-[var(--foreground)]"><ArrowLeft size={16} /> {t("workspace.backToBooks")}</Link>
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 sm:size-12"><BookOpen size={20} /></span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{book.name}</h1>
                <span className="rounded-full bg-[var(--card-muted)] px-2 py-0.5 text-[0.6rem] font-bold muted">{book.type === "SHARED" ? t("common.shared") : t("common.personal")}</span>
              </div>
              <p className="mt-0.5 text-sm muted">{book.description || t("nav.financialWorkspace")}</p>
            </div>
          </div>
          <button onClick={() => openTransaction()} className="btn-primary w-full sm:w-auto"><Plus size={17} /> {t("workspace.addTransaction")}</button>
        </div>
      </div>

      <div className="tab-scroll border-b">
        <div className="flex min-w-max gap-0.5">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "flex items-center gap-1.5 border-b-2 px-3 py-3 text-xs font-semibold sm:gap-2 sm:text-sm",
                tab === id ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : "border-transparent muted hover:text-[var(--foreground)]",
              )}
            >
              <Icon size={15} className="shrink-0" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {tab === "overview" && (
        <div className="space-y-4 sm:space-y-5">
          <div className="card p-4 sm:p-5">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-400">{t("workspace.overview.periodTitle")}</p>
                <h2 className="mt-1 text-lg font-bold">{selectedPeriodLabel}</h2>
                <p className="mt-1 text-sm muted">{t("workspace.overview.periodSubtitle")}</p>
              </div>
              <div className="flex w-full flex-col gap-2 lg:w-auto">
                <div className="grid grid-cols-2 rounded-xl bg-[var(--card-muted)] p-1 sm:grid-cols-4">
                  {(["MONTH", "CUSTOM", "YEAR", "ALL"] as PeriodMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        setPeriodMode(mode);
                        setTransactionPage(1);
                      }}
                      className={cn(
                        "min-h-10 rounded-lg px-3 text-xs font-semibold transition-colors",
                        periodMode === mode ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm" : "muted",
                      )}
                    >
                      {t(`workspace.overview.periods.${mode}`)}
                    </button>
                  ))}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {periodMode === "MONTH" && (
                    <select aria-label={t("workspace.overview.monthLabel")} value={selectedMonth} onChange={(event) => setSelectedMonth(Number(event.target.value))} className="input sm:min-w-52">
                      {accountingPeriodOptions.map((period) => <option key={period.value} value={period.value}>{period.label}</option>)}
                    </select>
                  )}
                  {(periodMode === "MONTH" || periodMode === "YEAR") && (
                    <select aria-label={t("workspace.overview.yearLabel")} value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))} className="input sm:min-w-28">
                      {availableYears.map((year) => <option key={year} value={year}>{year}</option>)}
                    </select>
                  )}
                  {periodMode === "CUSTOM" && (
                    <>
                      <label>
                        <span className="label">{t("workspace.overview.customStartLabel")}</span>
                        <input type="date" value={customStart} max={customEnd} onChange={(event) => { setCustomStart(event.target.value); setTransactionPage(1); }} className="input" />
                      </label>
                      <label>
                        <span className="label">{t("workspace.overview.customEndLabel")}</span>
                        <input type="date" value={customEnd} min={customStart} onChange={(event) => { setCustomEnd(event.target.value); setTransactionPage(1); }} className="input" />
                      </label>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            <Summary label={t("workspace.overview.netBalance")} value={totals.balance} icon={WalletCards} tone="emerald" currency={currency} />
            <Summary label={t("workspace.overview.totalIncome")} value={totals.income} icon={ArrowUpRight} tone="blue" currency={currency} />
            <Summary label={t("workspace.overview.totalExpense")} value={totals.expense} icon={ArrowDownRight} tone="orange" currency={currency} />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Insight
              label={t("workspace.overview.largestExpense")}
              value={largestExpense ? formatCurrency(largestExpense.amount, currency, locale) : "—"}
              detail={largestExpense?.description || largestExpense?.category?.name || t("workspace.overview.noPeriodData")}
            />
            <Insight
              label={t("workspace.overview.topCategory")}
              value={categoryData[0]?.name ?? "—"}
              detail={categoryData[0] ? formatCurrency(categoryData[0].value, currency, locale) : t("workspace.overview.noPeriodData")}
            />
            <Insight
              label={t("workspace.overview.activeDays")}
              value={String(activeDays)}
              detail={t("workspace.overview.transactionCount", { count: periodTransactions.length })}
            />
          </div>

          {undatedSummary.count > 0 && (
            <div className="card flex items-start gap-3 border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900 dark:bg-amber-950/30">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200">
                <CalendarDays size={18} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{t("workspace.overview.undatedTitle", { count: undatedSummary.count })}</p>
                <p className="mt-1 text-xs leading-5 muted">
                  {t("workspace.overview.undatedSummary", {
                    income: formatCurrency(undatedSummary.income, currency, locale),
                    expense: formatCurrency(undatedSummary.expense, currency, locale),
                  })}
                </p>
              </div>
            </div>
          )}

          <div className="grid gap-4 xl:grid-cols-[1.45fr_0.75fr]">
            <div className="card min-w-0 p-4 sm:p-5">
              <div>
                <h3 className="font-semibold">{t("workspace.overview.cashflowTitle")}</h3>
                <p className="mt-0.5 text-xs muted">{t("workspace.overview.cashflowSubtitle")}</p>
              </div>
              <div className="mt-4 h-72 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={cashflowData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} interval={periodMode === "MONTH" || periodMode === "CUSTOM" ? Math.max(0, Math.ceil(cashflowData.length / 8) - 1) : 0} tick={{ fill: "var(--muted)", fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 10 }} tickFormatter={(value) => new Intl.NumberFormat(localeToIntl(locale), { notation: "compact", maximumFractionDigits: 1 }).format(Number(value))} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value), currency, locale)} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="income" name={t("common.income")} stroke="#3b82f6" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                    <Line type="monotone" dataKey="expense" name={t("common.expense")} stroke="#f97316" strokeWidth={2.5} strokeDasharray="6 4" dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card min-w-0 p-4 sm:p-5">
              <h3 className="font-semibold">{t("workspace.overview.categoryBreakdown")}</h3>
              <p className="mt-0.5 text-xs muted">{t("workspace.overview.categorySubtitle")}</p>
              {categoryData.length ? (
                <>
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={44} outerRadius={68} paddingAngle={3}>
                          {categoryData.map((item, index) => <Cell key={item.name} fill={categoryChartColors[index % categoryChartColors.length]} />)}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(Number(value), currency, locale)} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {categoryData.map((item, index) => (
                      <div key={item.name} className="flex items-center justify-between gap-3 text-xs">
                        <span className="flex min-w-0 items-center gap-2"><span className="size-2.5 shrink-0 rounded-full" style={{ background: categoryChartColors[index % categoryChartColors.length] }} /><span className="truncate">{item.name}</span></span>
                        <strong className="shrink-0">{formatCurrency(item.value, currency, locale)}</strong>
                      </div>
                    ))}
                  </div>
                </>
              ) : <div className="grid h-56 place-items-center text-sm muted">{t("workspace.overview.noExpenseData")}</div>}
            </div>
          </div>

          <ActivityCalendar
            transactions={periodTransactions}
            year={selectedYear}
            month={selectedMonth}
            currency={currency}
            periodStart={periodMode === "MONTH" || periodMode === "CUSTOM" ? selectedPeriodBounds?.start ?? null : null}
            periodEnd={periodMode === "MONTH" || periodMode === "CUSTOM" ? selectedPeriodBounds?.end ?? null : null}
            onPeriodMove={moveReportingPeriod}
          />

          <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between p-4 sm:p-5"><div><h3 className="font-semibold">{t("workspace.overview.recentActivity")}</h3><p className="mt-0.5 text-xs muted">{t("workspace.overview.periodActivitySubtitle")}</p></div><button onClick={() => setTab("transactions")} className="min-h-10 text-xs font-semibold text-emerald-600">{t("workspace.overview.viewAll")}</button></div>
              <TransactionRows items={recentPeriodTransactions.slice(0, 5)} currency={currency} edit={openTransaction} remove={deleteTransaction} />
            </div>
            <div className="card p-4 sm:p-5">
              <div className="flex items-center justify-between"><div><h3 className="font-semibold">{t("workspace.overview.budgetStatus")}</h3><p className="mt-0.5 text-xs muted">{t("workspace.overview.budgetSubtitle")}</p></div><BellRing size={18} className="text-orange-500" /></div>
              <div className="mt-4 space-y-5">
                {visibleBudgets.slice(0, 4).map((budget) => <BudgetProgress key={budget.id} budget={budget} currency={currency} />)}
                {!visibleBudgets.length && <p className="py-12 text-center text-sm muted">{t("workspace.overview.noBudgets")}</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "transactions" && (
        <div className="card overflow-hidden">
          <div className="border-b p-4 sm:p-5">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
              <div><h2 className="font-semibold">{t("workspace.transactions.title")}</h2><p className="mt-0.5 text-xs muted">{t("workspace.transactions.filteredCount", { shown: filteredTransactions.length, total: transactions.length })}</p></div>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setTypeFilter("ALL");
                  setSortMode("DATE_DESC");
                  setPeriodMode("ALL");
                  setTransactionPage(1);
                }}
                className="min-h-10 self-start text-xs font-semibold text-emerald-600 hover:underline dark:text-emerald-400 sm:self-auto"
              >
                {t("workspace.transactions.resetFilters")}
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
              <label className="sm:col-span-2 xl:col-span-2">
                <span className="label">{t("workspace.transactions.searchLabel")}</span>
                <input value={search} onChange={(event) => { setSearch(event.target.value); setTransactionPage(1); }} className="input" placeholder={t("workspace.transactions.searchPlaceholder")} />
              </label>
              <label>
                <span className="label">{t("workspace.transactions.periodLabel")}</span>
                <select value={periodMode} onChange={(event) => { setPeriodMode(event.target.value as PeriodMode); setTransactionPage(1); }} className="input">
                  <option value="MONTH">{t("workspace.overview.periods.MONTH")}</option>
                  <option value="CUSTOM">{t("workspace.overview.periods.CUSTOM")}</option>
                  <option value="YEAR">{t("workspace.overview.periods.YEAR")}</option>
                  <option value="ALL">{t("workspace.overview.periods.ALL")}</option>
                </select>
              </label>
              {periodMode === "MONTH" && (
                <label>
                  <span className="label">{t("workspace.overview.monthLabel")}</span>
                  <select value={selectedMonth} onChange={(event) => { setSelectedMonth(Number(event.target.value)); setTransactionPage(1); }} className="input">
                    {accountingPeriodOptions.map((period) => <option key={period.value} value={period.value}>{period.label}</option>)}
                  </select>
                </label>
              )}
              {(periodMode === "MONTH" || periodMode === "YEAR") && (
                <label>
                  <span className="label">{t("workspace.overview.yearLabel")}</span>
                  <select value={selectedYear} onChange={(event) => { setSelectedYear(Number(event.target.value)); setTransactionPage(1); }} className="input">
                    {availableYears.map((year) => <option key={year} value={year}>{year}</option>)}
                  </select>
                </label>
              )}
              {periodMode === "CUSTOM" && (
                <>
                  <label>
                    <span className="label">{t("workspace.overview.customStartLabel")}</span>
                    <input type="date" value={customStart} max={customEnd} onChange={(event) => { setCustomStart(event.target.value); setTransactionPage(1); }} className="input" />
                  </label>
                  <label>
                    <span className="label">{t("workspace.overview.customEndLabel")}</span>
                    <input type="date" value={customEnd} min={customStart} onChange={(event) => { setCustomEnd(event.target.value); setTransactionPage(1); }} className="input" />
                  </label>
                </>
              )}
              <label>
                <span className="label">{t("workspace.transactions.typeLabel")}</span>
                <select value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value); setTransactionPage(1); }} className="input">
                  <option value="ALL">{t("workspace.transactions.allTypes")}</option>
                  <option value="INCOME">{t("common.income")}</option>
                  <option value="EXPENSE">{t("common.expense")}</option>
                </select>
              </label>
              <label>
                <span className="label">{t("workspace.transactions.sortLabel")}</span>
                <select value={sortMode} onChange={(event) => { setSortMode(event.target.value as SortMode); setTransactionPage(1); }} className="input">
                  <option value="DATE_DESC">{t("workspace.transactions.sortNewest")}</option>
                  <option value="DATE_ASC">{t("workspace.transactions.sortOldest")}</option>
                  <option value="AMOUNT_DESC">{t("workspace.transactions.sortHighest")}</option>
                  <option value="AMOUNT_ASC">{t("workspace.transactions.sortLowest")}</option>
                </select>
              </label>
            </div>
          </div>
          <TransactionRows items={visibleTransactions} currency={currency} edit={openTransaction} remove={deleteTransaction} full />
          {filteredTransactions.length > transactionPageSize && (
            <div className="flex flex-col gap-3 border-t p-4 text-xs sm:flex-row sm:items-center sm:justify-between">
              <p className="muted">
                {t("workspace.transactions.pageSummary", {
                  from: (safeTransactionPage - 1) * transactionPageSize + 1,
                  to: Math.min(safeTransactionPage * transactionPageSize, filteredTransactions.length),
                  total: filteredTransactions.length,
                })}
              </p>
              <div className="flex gap-2">
                <button type="button" disabled={safeTransactionPage === 1} onClick={() => setTransactionPage((page) => Math.max(1, page - 1))} className="btn-secondary min-h-10 flex-1 px-3 sm:flex-none">
                  <ChevronLeft size={16} /> {t("workspace.transactions.previousPage")}
                </button>
                <button type="button" disabled={safeTransactionPage === transactionPageCount} onClick={() => setTransactionPage((page) => Math.min(transactionPageCount, page + 1))} className="btn-secondary min-h-10 flex-1 px-3 sm:flex-none">
                  {t("workspace.transactions.nextPage")} <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "categories" && (
        <div>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div><h2 className="text-xl font-bold">{t("workspace.categories.title")}</h2><p className="mt-1 text-sm muted">{t("workspace.categories.subtitle")}</p></div>
            <button onClick={() => openCategory()} className="btn-primary w-full sm:w-auto"><Plus size={17} /> {t("workspace.categories.addBtn")}</button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
            {categories.map((category) => (
              <div key={category.id} className="card p-4 sm:p-5">
                <div className="flex items-start justify-between">
                  <span className="grid size-10 place-items-center rounded-xl text-white sm:size-11" style={{ background: category.color }}><FolderOpen size={19} /></span>
                  <div className="flex gap-1">
                    <button aria-label={t("common.edit")} title={t("common.edit")} onClick={() => openCategory(category)} className="grid size-11 place-items-center rounded-lg hover:bg-[var(--card-muted)]"><Pencil size={15} /></button>
                    <button aria-label={t("common.delete")} title={t("common.delete")} onClick={() => deleteCategory(category.id)} className="grid size-11 place-items-center rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950"><Trash2 size={15} /></button>
                  </div>
                </div>
                <h3 className="mt-3 font-bold sm:mt-4">{category.name}</h3>
                <div className="mt-2 flex items-center justify-between text-xs muted">
                  <span>{categoryTypeLabel(category.type)}</span>
                  <span>{t("workspace.categories.countTx", { count: category._count.transactions })}</span>
                </div>
              </div>
            ))}
            {!categories.length && <Empty text={t("workspace.categories.emptyText")} />}
          </div>
        </div>
      )}

      {tab === "budgets" && (
        <div>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div><h2 className="text-xl font-bold">{t("workspace.budgets.title")}</h2><p className="mt-1 text-sm muted">{t("workspace.budgets.subtitle")}</p></div>
            <button onClick={() => openBudget()} className="btn-primary w-full sm:w-auto"><Plus size={17} /> {t("workspace.budgets.addBtn")}</button>
          </div>
          <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
            {budgets.map((budget) => (
              <div key={budget.id} className="card p-4 sm:p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="rounded-full bg-[var(--card-muted)] px-2.5 py-1 text-[0.65rem] font-bold muted">{periodLabel(budget.period)}</span>
                    <h3 className="mt-2.5 font-bold">{budget.name}</h3>
                    <p className="mt-1 text-xs muted">{budget.category?.name ?? t("workspace.budgets.allCategories")} · {formatDate(budget.startDate, locale)} – {formatDate(budget.endDate, locale)}</p>
                  </div>
                  <div className="flex gap-1">
                    <button aria-label={t("common.edit")} title={t("common.edit")} onClick={() => openBudget(budget)} className="grid size-11 place-items-center rounded-lg hover:bg-[var(--card-muted)]"><Pencil size={15} /></button>
                    <button aria-label={t("common.delete")} title={t("common.delete")} onClick={() => deleteBudget(budget.id)} className="grid size-11 place-items-center rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950"><Trash2 size={15} /></button>
                  </div>
                </div>
                <div className="mt-4"><BudgetProgress budget={budget} currency={currency} /></div>
              </div>
            ))}
            {!budgets.length && <Empty text={t("workspace.budgets.emptyText")} />}
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div><h2 className="text-xl font-bold">{t("workspace.history.title")}</h2><p className="mt-1 text-sm muted">{t("workspace.history.subtitle")}</p></div>
            <select value={historyMonths} onChange={(event) => setHistoryMonths(Number(event.target.value))} className="input sm:w-48">
              <option value={1}>{t("workspace.history.period1")}</option>
              <option value={3}>{t("workspace.history.period3")}</option>
              <option value={6}>{t("workspace.history.period6")}</option>
              <option value={12}>{t("workspace.history.period12")}</option>
            </select>
          </div>
          <div className="card p-4 sm:p-5">
            <div className="h-72 sm:h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 10 }} tickFormatter={(value) => `${Math.round(value / 1_000_000)}M`} width={38} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value), currency, locale)} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="income" name={t("workspace.history.incomeLabel")} fill="#22c55e" radius={[5, 5, 0, 0]} />
                  <Bar dataKey="expense" name={t("workspace.history.expenseLabel")} fill="#f97316" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {tab === "members" && (
        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <div className="card overflow-hidden">
            <div className="p-4 sm:p-5"><h2 className="font-semibold">{t("workspace.members.title")}</h2><p className="mt-0.5 text-xs muted">{t("workspace.members.subtitle", { count: book.members.length })}</p></div>
            {book.members.map((member) => (
              <div key={member.id} className="flex items-center gap-3 border-t px-4 py-3.5 sm:px-5">
                <span className="grid size-10 place-items-center rounded-xl bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-950">{initials(member.user.name)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{member.user.name}{member.user.id === userId && <span className="ml-2 text-xs font-normal muted">({t("workspace.members.you")})</span>}</p>
                  <p className="truncate text-xs muted">{member.user.email}</p>
                </div>
                <span className="shrink-0 rounded-full bg-[var(--card-muted)] px-2.5 py-1 text-[0.65rem] font-bold muted">{member.role === "OWNER" ? t("workspace.members.ownerRole") : t("workspace.members.memberRole")}</span>
              </div>
            ))}
          </div>
          <div className="card h-fit p-4 sm:p-5">
            <Share2 className="text-emerald-600" size={21} />
            <h3 className="mt-3 font-bold">{t("workspace.members.inviteTitle")}</h3>
            {book.type === "SHARED" ? (
              <SharedInviteControls
                bookId={book.id}
                initialCode={book.inviteCode}
                initialExpiresAt={book.inviteCodeExpiresAt}
              />
            ) : (
              <>
                <p className="mt-2 text-sm leading-6 muted">{t("workspace.members.noInviteDesc")}</p>
                <button onClick={() => setTab("settings")} className="btn-secondary mt-4 w-full">{t("workspace.members.openSettings")}</button>
              </>
            )}
          </div>
        </div>
      )}

      {tab === "settings" && (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
          <form onSubmit={updateBook} className="card p-5 sm:p-6">
            <h2 className="font-semibold">{t("workspace.settings.title")}</h2>
            <p className="mt-1 text-xs muted">{t("workspace.settings.subtitle")}</p>
            <fieldset disabled={book.ownerId !== userId} className="mt-5 space-y-4">
              <div><label className="label">{t("workspace.settings.nameLabel")}</label><input name="name" defaultValue={book.name} required className="input" /></div>
              <div><label className="label">{t("workspace.settings.descLabel")}</label><textarea name="description" defaultValue={book.description ?? ""} rows={3} className="input resize-none" /></div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div><label className="label">{t("workspace.settings.typeLabel")}</label><select name="type" defaultValue={book.type} className="input"><option value="PERSONAL">{t("common.personal")}</option><option value="SHARED">{t("common.shared")}</option></select></div>
                <div><label className="label">{t("workspace.settings.currencyLabel")}</label><select name="currency" defaultValue={book.currency} className="input"><option>IDR</option><option>USD</option><option>SGD</option><option>MYR</option></select></div>
              </div>
              <button disabled={loading} className="btn-primary">{loading ? <LoaderCircle className="animate-spin" size={17} /> : <Check size={17} />} {t("workspace.settings.saveBtn")}</button>
            </fieldset>
          </form>
          <div className="card h-fit border-red-200 p-5 dark:border-red-900 sm:p-6">
            <h2 className="font-semibold text-red-600">{t("workspace.settings.dangerTitle")}</h2>
            <p className="mt-2 text-sm leading-6 muted">{t("workspace.settings.dangerDesc")}</p>
            <button disabled={book.ownerId !== userId} onClick={deleteBook} className="btn-danger mt-4 w-full"><Trash2 size={17} /> {t("workspace.settings.deleteBtn")}</button>
          </div>
        </div>
      )}

      {modal === "transaction" && (
        <Modal title={t(editingTx ? "workspace.transactions.editTitle" : "workspace.transactions.addTitle")} description={t("workspace.transactions.addDesc")} close={closeModal}>
          <form key={editingTx?.id ?? "new"} onSubmit={submitTransaction} className="mt-6 space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div><label className="label">{t("workspace.transactions.typeLabel")}</label><select name="type" defaultValue={editingTx?.type ?? "EXPENSE"} className="input"><option value="EXPENSE">{t("common.expense")}</option><option value="INCOME">{t("common.income")}</option></select></div>
              <div><label className="label">{t("workspace.transactions.amountLabel")}</label><input name="amount" type="number" min="1" step="0.01" defaultValue={editingTx?.amount} required className="input" placeholder="0" /></div>
            </div>
            <div><label className="label">{t("workspace.transactions.categoryLabel")}</label><select name="categoryId" defaultValue={editingTx?.categoryId ?? ""} className="input"><option value="">{t("workspace.transactions.noCategory")}</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
            <div>
              <label className="label">{t("workspace.transactions.dateLabel")}</label>
              <input
                name="date"
                type="date"
                defaultValue={editingTx?.dateKnown ? editingTx.date.slice(0, 10) : editingTx ? "" : todayInput()}
                required={!editingTx || editingTx.dateKnown}
                className="input"
              />
              {editingTx && !editingTx.dateKnown && <p className="mt-1.5 text-xs muted">{t("workspace.transactions.dateUnknownHelp")}</p>}
            </div>
            <div><label className="label">{t("workspace.transactions.descLabel")}</label><textarea name="description" maxLength={240} rows={3} defaultValue={editingTx?.description ?? ""} className="input resize-none" placeholder={t("workspace.transactions.descPlaceholder")} /></div>
            <button disabled={loading} className="btn-primary w-full">{loading ? <LoaderCircle className="animate-spin" size={17} /> : <Check size={17} />} {t("workspace.transactions.saveBtn")}</button>
          </form>
        </Modal>
      )}
      {modal === "category" && (
        <Modal title={t(editingCategory ? "workspace.categories.editTitle" : "workspace.categories.addTitle")} description={t("workspace.categories.addDesc")} close={closeModal}>
          <form key={editingCategory?.id ?? "new"} onSubmit={submitCategory} className="mt-6 space-y-4">
            <div><label className="label">{t("workspace.categories.nameLabel")}</label><input name="name" defaultValue={editingCategory?.name} required minLength={2} className="input" placeholder={t("workspace.categories.namePlaceholder")} /></div>
            <div className="grid grid-cols-[1fr_90px] gap-3">
              <div><label className="label">{t("workspace.categories.typeLabel")}</label><select name="type" defaultValue={editingCategory?.type ?? "BOTH"} className="input"><option value="BOTH">{t("workspace.categories.typeBoth")}</option><option value="EXPENSE">{t("common.expense")}</option><option value="INCOME">{t("common.income")}</option></select></div>
              <div><label className="label">{t("workspace.categories.colorLabel")}</label><input name="color" type="color" defaultValue={editingCategory?.color ?? "#16a34a"} className="input h-[43px] p-1" /></div>
            </div>
            <input type="hidden" name="icon" value="FolderOpen" />
            <button disabled={loading} className="btn-primary w-full">{loading ? <LoaderCircle className="animate-spin" size={17} /> : <Check size={17} />} {t("workspace.categories.saveBtn")}</button>
          </form>
        </Modal>
      )}
      {modal === "budget" && (
        <Modal title={t(editingBudget ? "workspace.budgets.editTitle" : "workspace.budgets.addTitle")} description={t("workspace.budgets.addDesc")} close={closeModal}>
          <form key={editingBudget?.id ?? "new"} onSubmit={submitBudget} className="mt-6 space-y-4">
            <div><label className="label">{t("workspace.budgets.nameLabel")}</label><input name="name" defaultValue={editingBudget?.name} required className="input" placeholder={t("workspace.budgets.namePlaceholder")} /></div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div><label className="label">{t("workspace.budgets.limitLabel")}</label><input name="amount" type="number" min="1" defaultValue={editingBudget?.amount} required className="input" placeholder="0" /></div>
              <div><label className="label">{t("workspace.budgets.periodLabel")}</label><select name="period" defaultValue={editingBudget?.period ?? "MONTHLY"} className="input"><option value="WEEKLY">{t("workspace.budgets.periods.WEEKLY")}</option><option value="MONTHLY">{t("workspace.budgets.periods.MONTHLY")}</option><option value="QUARTERLY">{t("workspace.budgets.periods.QUARTERLY")}</option><option value="YEARLY">{t("workspace.budgets.periods.YEARLY")}</option></select></div>
            </div>
            <div><label className="label">{t("workspace.budgets.categoryLabel")}</label><select name="categoryId" defaultValue={editingBudget?.categoryId ?? ""} className="input"><option value="">{t("workspace.budgets.allCategories")}</option>{categories.filter((category) => category.type !== "INCOME").map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div><label className="label">{t("workspace.budgets.startLabel")}</label><input name="startDate" type="date" defaultValue={editingBudget ? editingBudget.startDate.slice(0, 10) : todayInput(new Date(new Date().getFullYear(), new Date().getMonth(), 1))} required className="input" /></div>
              <div><label className="label">{t("workspace.budgets.endLabel")}</label><input name="endDate" type="date" defaultValue={editingBudget ? editingBudget.endDate.slice(0, 10) : todayInput(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0))} required className="input" /></div>
            </div>
            <div><label className="label">{t("workspace.budgets.alertLabel")}</label><input name="alertAt" type="number" min="1" max="100" defaultValue={editingBudget?.alertAt ?? 80} required className="input" /></div>
            <button disabled={loading} className="btn-primary w-full">{loading ? <LoaderCircle className="animate-spin" size={17} /> : <Check size={17} />} {t("workspace.budgets.saveBtn")}</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function ActivityCalendar({
  transactions,
  year,
  month,
  currency,
  periodStart,
  periodEnd,
  onPeriodMove,
}: {
  transactions: Transaction[];
  year: number;
  month: number;
  currency: string;
  periodStart: Date | null;
  periodEnd: Date | null;
  onPeriodMove: (offset: number) => void;
}) {
  const { locale, t } = useLanguage();
  const firstDay = periodStart ? new Date(periodStart) : new Date(year, month, 1);
  const lastDay = periodEnd ? new Date(periodEnd) : new Date(year, month + 1, 0);
  firstDay.setHours(0, 0, 0, 0);
  lastDay.setHours(23, 59, 59, 999);
  const weekStartsOn = locale === "id" ? 1 : 0;
  const leadingDays = (firstDay.getDay() - weekStartsOn + 7) % 7;
  const calendarTransactions = transactions.filter((transaction) => {
    if (!transaction.dateKnown) return false;
    const date = transactionDate(transaction);
    return date >= firstDay && date <= lastDay;
  });
  const dates: Date[] = [];
  for (const cursor = new Date(firstDay); cursor <= lastDay; cursor.setDate(cursor.getDate() + 1)) {
    dates.push(new Date(cursor));
  }
  const cells: Array<Date | null> = [...Array.from({ length: leadingDays }, () => null), ...dates];
  while (cells.length % 7) cells.push(null);

  const weekdayLabels = Array.from({ length: 7 }, (_, index) => {
    const sunday = new Date(2024, 0, 7 + index + weekStartsOn);
    return new Intl.DateTimeFormat(localeToIntl(locale), { weekday: "short" }).format(sunday);
  });
  const monthLabel = periodStart && periodEnd
    ? `${new Intl.DateTimeFormat(localeToIntl(locale), { day: "numeric", month: "short" }).format(firstDay)} – ${new Intl.DateTimeFormat(localeToIntl(locale), { day: "numeric", month: "short", year: "numeric" }).format(lastDay)}`
    : new Intl.DateTimeFormat(localeToIntl(locale), { month: "long", year: "numeric" }).format(firstDay);
  const compactCurrency = (value: number) => new Intl.NumberFormat(localeToIntl(locale), {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

  function moveMonth(offset: number) {
    onPeriodMove(offset);
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <h3 className="font-semibold">{t("workspace.overview.calendarTitle")}</h3>
          <p className="mt-0.5 text-xs muted">{t("workspace.overview.calendarSubtitle")}</p>
        </div>
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <button type="button" onClick={() => moveMonth(-1)} aria-label={t("workspace.overview.previousMonth")} className="grid size-11 place-items-center rounded-xl border hover:bg-[var(--card-muted)]"><ChevronLeft size={18} /></button>
          <strong className="min-w-36 text-center text-sm capitalize">{monthLabel}</strong>
          <button type="button" onClick={() => moveMonth(1)} aria-label={t("workspace.overview.nextMonth")} className="grid size-11 place-items-center rounded-xl border hover:bg-[var(--card-muted)]"><ChevronRight size={18} /></button>
        </div>
      </div>
      <div className="p-2 sm:p-4">
        <div role="row" className="grid grid-cols-7">
          {weekdayLabels.map((day) => <div role="columnheader" key={day} className="px-1 py-2 text-center text-[0.62rem] font-bold uppercase tracking-wide muted sm:text-xs">{day}</div>)}
        </div>
        <div role="grid" aria-label={`${t("workspace.overview.calendarTitle")} ${monthLabel}`} className="grid grid-cols-7 overflow-hidden rounded-xl border">
          {cells.map((date, index) => {
            if (!date) return <div key={`empty-${index}`} role="gridcell" className="min-h-16 border-b border-r bg-[var(--card-muted)]/40 sm:min-h-24" />;
            const items = calendarTransactions.filter((transaction) => transactionDate(transaction).toDateString() === date.toDateString());
            const income = items.filter((transaction) => transaction.type === "INCOME").reduce((sum, transaction) => sum + transaction.amount, 0);
            const expense = items.filter((transaction) => transaction.type === "EXPENSE").reduce((sum, transaction) => sum + transaction.amount, 0);
            const dateLabel = new Intl.DateTimeFormat(localeToIntl(locale), { day: "numeric", month: "long", year: "numeric" }).format(date);
            const ariaLabel = `${dateLabel}. ${t("common.income")}: ${formatCurrency(income, currency, locale)}. ${t("common.expense")}: ${formatCurrency(expense, currency, locale)}.`;
            const showMonth = date.getTime() === firstDay.getTime() || date.getDate() === 1;
            return (
              <div key={date.toISOString()} role="gridcell" aria-label={ariaLabel} className="min-h-16 min-w-0 border-b border-r p-1.5 sm:min-h-24 sm:p-2.5">
                <div className="flex items-center gap-1">
                  <span className={`grid size-6 place-items-center rounded-full text-xs font-semibold ${items.length ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "muted"}`}>{date.getDate()}</span>
                  {showMonth && <span className="text-[0.55rem] font-bold uppercase muted sm:text-[0.62rem]">{new Intl.DateTimeFormat(localeToIntl(locale), { month: "short" }).format(date)}</span>}
                </div>
                <div className="mt-1.5 space-y-1 overflow-hidden">
                  {income > 0 && <p title={formatCurrency(income, currency, locale)} className="truncate text-[0.55rem] font-bold text-emerald-600 dark:text-emerald-400 sm:text-[0.68rem]">+{compactCurrency(income)}</p>}
                  {expense > 0 && <p title={formatCurrency(expense, currency, locale)} className="truncate text-[0.55rem] font-bold text-orange-600 dark:text-orange-400 sm:text-[0.68rem]">-{compactCurrency(expense)}</p>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs muted">
          <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-emerald-500" />{t("common.income")}</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-orange-500" />{t("common.expense")}</span>
        </div>
      </div>
    </div>
  );
}

function Insight({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="card min-w-0 p-4">
      <p className="text-xs font-medium muted">{label}</p>
      <p className="mt-2 truncate text-base font-bold">{value}</p>
      <p className="mt-1 truncate text-xs muted">{detail}</p>
    </div>
  );
}

function Summary({ label, value, icon: Icon, tone, currency }: { label: string; value: number; icon: typeof WalletCards; tone: "emerald" | "blue" | "orange"; currency: string }) {
  const { locale } = useLanguage();
  const colors = {
    emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-950",
    orange: "bg-orange-100 text-orange-700 dark:bg-orange-950",
  };

  return (
    <div className="card flex items-center gap-3 p-4 sm:gap-4 sm:p-5">
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl sm:size-11 ${colors[tone]}`}><Icon size={19} /></span>
      <div>
        <p className="text-[0.7rem] leading-4 muted sm:text-xs">{label}</p>
        <p className="mt-1 text-base font-bold sm:text-xl">{formatCurrency(value, currency, locale)}</p>
      </div>
    </div>
  );
}

function TransactionRows({ items, currency, edit, remove, full = false }: { items: Transaction[]; currency: string; edit: (tx: Transaction) => void; remove: (id: string) => void; full?: boolean }) {
  const { locale, t } = useLanguage();

  if (!items.length) return <div className="grid h-40 place-items-center text-sm muted">{t("workspace.transactions.noResults")}</div>;
  if (full) {
    return (
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>{t("workspace.transactions.colTransaction")}</th>
              <th>{t("workspace.transactions.colCategory")}</th>
              <th>{t("workspace.transactions.colDate")}</th>
              <th className="hidden sm:table-cell">{t("workspace.transactions.colBy")}</th>
              <th className="text-right">{t("workspace.transactions.colAmount")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((tx) => (
              <tr key={tx.id}>
                <td>
                  <p className="font-semibold">{tx.description || t("workspace.transactions.noNote")}</p>
                  <p className="text-xs muted">{tx.type === "INCOME" ? t("common.income") : t("common.expense")}</p>
                </td>
                <td>{tx.category ? <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full shrink-0" style={{ background: tx.category.color }} />{tx.category.name}</span> : <span className="muted">{t("workspace.transactions.noCategory")}</span>}</td>
                <td className="whitespace-nowrap">{displayTransactionDate(tx, locale, t("workspace.transactions.dateUnknown"))}</td>
                <td className="hidden sm:table-cell">{tx.createdBy.name}</td>
                <td className={`text-right font-bold whitespace-nowrap ${tx.type === "INCOME" ? "text-emerald-600" : ""}`}>{tx.type === "INCOME" ? "+" : "-"}{formatCurrency(tx.amount, currency, locale)}</td>
                <td>
                  <div className="flex justify-end gap-1">
                    <button aria-label={t("common.edit")} title={t("common.edit")} onClick={() => edit(tx)} className="grid size-11 place-items-center rounded-lg hover:bg-[var(--card-muted)]"><Pencil size={14} /></button>
                    <button aria-label={t("common.delete")} title={t("common.delete")} onClick={() => remove(tx.id)} className="grid size-11 place-items-center rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div>
      {items.map((tx) => (
        <div key={tx.id} className="flex items-center gap-3 border-t px-4 py-3 sm:px-5 sm:py-3.5">
          <span className={`grid size-9 shrink-0 place-items-center rounded-xl sm:size-10 ${tx.type === "INCOME" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950" : "bg-orange-100 text-orange-700 dark:bg-orange-950"}`}><ReceiptText size={16} /></span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{tx.description || tx.category?.name || t("common.transactions")}</p>
            <p className="mt-0.5 text-xs muted">{displayTransactionDate(tx, locale, t("workspace.transactions.dateUnknown"))} · {tx.createdBy.name}</p>
          </div>
          <strong className={`shrink-0 text-xs sm:text-sm ${tx.type === "INCOME" ? "text-emerald-600" : ""}`}>{tx.type === "INCOME" ? "+" : "-"}{formatCurrency(tx.amount, currency, locale)}</strong>
          <button aria-label={t("common.edit")} title={t("common.edit")} onClick={() => edit(tx)} className="grid size-11 shrink-0 place-items-center rounded-lg hover:bg-[var(--card-muted)]"><Pencil size={14} /></button>
        </div>
      ))}
    </div>
  );
}

function BudgetProgress({ budget, currency }: { budget: Budget; currency: string }) {
  const { locale, t } = useLanguage();
  const percent = Math.min(100, budget.amount ? (budget.spent / budget.amount) * 100 : 0);
  const color = percent >= 100 ? "bg-red-500" : percent >= budget.alertAt ? "bg-orange-500" : "bg-emerald-500";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs"><span className="font-semibold">{budget.name}</span><span className="muted">{Math.round(percent)}%</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--card-muted)]"><div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }} /></div>
      <div className="mt-2 flex justify-between text-[0.68rem] muted"><span>{formatCurrency(budget.spent, currency, locale)}</span><span>{t("workspace.budgets.fromLabel")} {formatCurrency(budget.amount, currency, locale)}</span></div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="card col-span-full grid min-h-64 place-items-center p-8 text-center"><div><FolderOpen className="mx-auto muted" size={30} /><p className="mx-auto mt-3 max-w-sm text-sm leading-6 muted">{text}</p></div></div>;
}
