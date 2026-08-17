"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownRight, ArrowUpRight, Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/language-context";

function todayInput(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

type Book = { id: string; name: string; type: "PERSONAL" | "SHARED"; currency: string };
type Category = { id: string; name: string };
type SuccessState = {
  bookName: string;
  amount: number;
  type: string;
  remaining: number | null;
  currency: string;
};

/* Full-screen sheet on phones, centred dialog from sm up. */
const OVERLAY = "modal-overlay fixed inset-0 z-50 flex justify-center bg-black/55 sm:items-center sm:p-4";
const SHEET = "modal-sheet card flex h-dvh w-full flex-col overflow-hidden rounded-none border-0 shadow-2xl sm:h-auto sm:max-h-[92dvh] sm:max-w-lg sm:rounded-2xl sm:border";

export default function QuickAddModal({ initialType }: { initialType?: "PERSONAL" | "SHARED" }) {
  const { t } = useLanguage();
  const router = useRouter();

  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [initializing, setInitializing] = useState(true);
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<"PERSONAL" | "SHARED">(initialType ?? "PERSONAL");
  const [amount, setAmount] = useState("");
  const [typeTx, setTypeTx] = useState("EXPENSE");
  const [financeBookId, setFinanceBookId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [date, setDate] = useState(todayInput(new Date()));
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successState, setSuccessState] = useState<SuccessState | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/books");
        if (!res.ok) {
          setBooks([]);
          return;
        }
        const payload = await res.json();
        setBooks(payload.books ?? []);
      } catch {
        setBooks([]);
      } finally {
        setInitializing(false);
      }
    })();
  }, []);

  // Keep the page behind the sheet from scrolling with it (mobile scroll chaining).
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);

  const selectedBook = books.find((book) => book.type === tab) ?? books[0] ?? null;
  const effectiveBookId = financeBookId && books.some((book) => book.id === financeBookId && book.type === tab) ? financeBookId : selectedBook?.id ?? null;

  useEffect(() => {
    (async () => {
      if (!effectiveBookId) return;
      try {
        const res = await fetch(`/api/books/${effectiveBookId}/categories`);
        if (!res.ok) return;
        const payload = await res.json();
        setCategories(payload.categories ?? []);
      } catch {
        // ignore
      }
    })();
  }, [effectiveBookId]);

  function closeQuickAdd() {
    setOpen(false);
    if (typeof window !== "undefined") {
      const canGoBack = window.history.length > 1 && document.referrer && document.referrer.startsWith(window.location.origin);
      if (canGoBack) {
        window.history.back();
        return;
      }
      if (typeof window.close === "function") {
        try {
          window.close();
          return;
        } catch {
          // ignore
        }
      }
    }
    router.push("/dashboard");
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeQuickAdd();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  async function submit(e?: FormEvent) {
    if (e) e.preventDefault();
    if (!effectiveBookId) return toast.error(t("workspace.selectBookFirst"));

    const amountValue = Number(amount || 0);

    setSubmitting(true);
    try {
      const payload = { amount: amountValue, type: typeTx, description, date, categoryId };
      const res = await fetch(`/api/books/${effectiveBookId}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed");

      toast.success(t("workspace.quickAddSuccess"));

      const targetBook = books.find((b) => b.id === effectiveBookId);
      let remaining: number | null = null;

      if (targetBook?.type === "SHARED") {
        try {
          const r = await fetch(`/api/books/${effectiveBookId}/budgets`);
          if (r.ok) {
            const pb = await r.json();
            const budgets = pb.budgets ?? [];
            const firstBudget = budgets[0];
            if (firstBudget) {
              remaining = Number(firstBudget.amount ?? 0) - Number(firstBudget.spent ?? 0) - amountValue;
              toast(`${t("workspace.budgetRemaining", { name: firstBudget.name })}: ${remaining.toLocaleString()} ${targetBook.currency}`);
            }
          }
        } catch {
          // ignore
        }
      }

      setSuccessState({
        bookName: targetBook?.name ?? "Book",
        amount: amountValue,
        type: typeTx,
        remaining,
        currency: targetBook?.currency ?? "IDR",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  if (initializing) {
    return (
      <div className={OVERLAY}>
        <div className={`${SHEET} items-center justify-center gap-3`}>
          <Loader2 className="size-7 animate-spin text-emerald-600 dark:text-emerald-400" />
          <p className="text-sm muted">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (successState) {
    const isIncome = successState.type === "INCOME";

    return (
      <div className={OVERLAY}>
        <div role="dialog" aria-modal="true" aria-labelledby="quick-add-success-title" className={SHEET}>
          <div className="sheet-top flex flex-1 flex-col justify-center overflow-y-auto overscroll-contain px-5 pb-5 sm:flex-none sm:px-6">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <Check size={26} strokeWidth={2.5} />
            </div>

            <div className="mt-4 text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">{t("workspace.quickAdd")}</p>
              <h2 id="quick-add-success-title" className="mt-1.5 text-lg font-bold sm:text-xl">{t("workspace.quickAddSuccess")}</h2>
              <p className="mt-1 inline-flex items-center gap-1 text-sm muted">
                {isIncome ? <ArrowUpRight size={14} className="text-emerald-600 dark:text-emerald-400" /> : <ArrowDownRight size={14} />}
                {successState.amount.toLocaleString()} {successState.currency} · {isIncome ? t("common.income") : t("common.expense")}
              </p>
            </div>

            <div className="mt-5 rounded-xl border bg-[var(--card-muted)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] muted">{t("workspace.transactions.targetBook")}</p>
              <p className="mt-1 text-sm font-semibold">{successState.bookName}</p>
              {successState.remaining !== null && (
                <p className="mt-3 rounded-lg bg-emerald-100 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {t("workspace.budgetRemaining", { name: successState.bookName })}: <span className="font-semibold">{successState.remaining.toLocaleString()} {successState.currency}</span>
                </p>
              )}
            </div>
          </div>

          <div className="sheet-bottom grid gap-2 border-t bg-[var(--card-muted)] px-5 pt-4 sm:px-6">
            <button type="button" onClick={() => { setSuccessState(null); setDescription(""); setAmount(""); setCategoryId(null); }} className="btn-primary w-full active:scale-[0.99]">
              {t("workspace.quickAdd")}
            </button>
            <button type="button" onClick={() => router.push("/dashboard")} className="btn-secondary w-full active:scale-[0.99]">
              {t("common.dashboard")}
            </button>
            <button type="button" onClick={closeQuickAdd} className="min-h-11 w-full rounded-lg text-sm font-semibold muted transition-colors hover:bg-[var(--card)]">
              {t("workspace.closeApp")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { value: "PERSONAL" as const, label: t("common.personal") },
    { value: "SHARED" as const, label: t("common.shared") },
  ];

  return (
    <div className={OVERLAY}>
      <div role="dialog" aria-modal="true" aria-labelledby="quick-add-title" className={SHEET}>
        {/* Close sits on the left on phones, matching the Android full-screen dialog pattern. */}
        <div className="sheet-top flex items-center gap-3 border-b px-3 pb-3 sm:items-start sm:gap-4 sm:px-6 sm:pb-6">
          <button
            type="button"
            aria-label={t("common.close")}
            onClick={closeQuickAdd}
            className="order-first grid size-12 shrink-0 place-items-center rounded-full transition-colors hover:bg-[var(--card-muted)] active:bg-[var(--card-muted)] sm:order-last sm:size-11 sm:rounded-lg"
          >
            <X size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="hidden text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-600 sm:block dark:text-emerald-400">{t("workspace.quickAdd")}</p>
            <h2 id="quick-add-title" className="truncate text-base font-bold sm:mt-1.5 sm:text-xl">{t("workspace.quickAddTitle")}</h2>
            <p className="mt-1 hidden text-sm leading-6 muted sm:block">{t("workspace.quickAddDesc")}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6">
          <div className="grid grid-cols-2 gap-1 rounded-xl border bg-[var(--card-muted)] p-1">
            {tabs.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={tab === item.value}
                onClick={() => { setTab(item.value); setFinanceBookId(null); setCategoryId(null); }}
                className={`min-h-12 rounded-lg px-3 text-sm font-semibold transition-colors active:scale-[0.99] ${
                  tab === item.value
                    ? "bg-[var(--primary)] text-white shadow-sm dark:text-[#00150b]"
                    : "muted hover:bg-[var(--card)]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <form id="quick-add-form" onSubmit={submit} className="mt-5 grid gap-4">
            {!books.length && (
              <div className="rounded-xl border border-dashed p-4 text-sm muted">
                {t("workspace.quickAddNoBooks")}
              </div>
            )}

            <div>
              <label className="label" htmlFor="quick-add-amount">{t("workspace.transactions.amount")}</label>
              <input
                id="quick-add-amount"
                type="number"
                inputMode="decimal"
                enterKeyHint="next"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input text-lg font-semibold"
                placeholder="0"
              />
            </div>

            <div>
              <label className="label" htmlFor="quick-add-type">{t("workspace.transactions.type")}</label>
              <select id="quick-add-type" value={typeTx} onChange={(e) => setTypeTx(e.target.value)} className="input">
                <option value="EXPENSE">{t("common.expense")}</option>
                <option value="INCOME">{t("common.income")}</option>
              </select>
            </div>

            <div>
              <label className="label" htmlFor="quick-add-book">{t("workspace.transactions.targetBook")}</label>
              <select id="quick-add-book" value={effectiveBookId ?? ""} onChange={(e) => setFinanceBookId(e.target.value || null)} className="input" disabled={!books.length}>
                {books.filter((b) => b.type === tab).map((b) => (
                  <option key={b.id} value={b.id}>{b.name} · {b.type === "SHARED" ? t("common.shared") : t("common.personal")}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="quick-add-category">{t("workspace.transactions.category")}</label>
              <select id="quick-add-category" value={categoryId ?? ""} onChange={(e) => setCategoryId(e.target.value || null)} className="input">
                <option value="">{t("workspace.transactions.noCategory")}</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="quick-add-date">{t("workspace.transactions.date")}</label>
              <input id="quick-add-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
            </div>

            <div>
              <label className="label" htmlFor="quick-add-description">{t("workspace.transactions.description")}</label>
              <textarea
                id="quick-add-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                enterKeyHint="done"
                className="input min-h-24 resize-y"
                placeholder={t("workspace.transactions.descPlaceholder") ?? "Add notes..."}
              />
            </div>
          </form>
        </div>

        <div className="sheet-bottom border-t bg-[var(--card-muted)] px-5 pt-4 sm:px-6">
          <button type="submit" form="quick-add-form" disabled={submitting || !books.length} className="btn-primary w-full active:scale-[0.99]">
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {submitting ? t("common.loading") : t("workspace.saveTransaction")}
          </button>
        </div>
      </div>
    </div>
  );
}
