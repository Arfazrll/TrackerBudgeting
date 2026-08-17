"use client";

import { FormEvent, useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
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

export default function QuickAddModal({ initialType }: { initialType?: "PERSONAL" | "SHARED" }) {
  const { t } = useLanguage();
  const router = useRouter();

  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<"PERSONAL" | "SHARED">(initialType ?? "PERSONAL");
  const [amount, setAmount] = useState(0);
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
        if (!res.ok) return;
        const payload = await res.json();
        setBooks(payload.books ?? []);
      } catch {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!financeBookId) return;
      try {
        const res = await fetch(`/api/books/${financeBookId}/categories`);
        if (!res.ok) return;
        const payload = await res.json();
        setCategories(payload.categories ?? []);
      } catch {
        // ignore
      }
    })();
  }, [financeBookId]);

  useEffect(() => {
    const pick = books.find((b) => b.type === tab) ?? books[0];
    setFinanceBookId(pick?.id ?? null);
  }, [books, tab]);

  async function submit(e?: FormEvent) {
    if (e) e.preventDefault();
    if (!financeBookId) return toast.error(t("workspace.selectBookFirst"));

    setSubmitting(true);
    try {
      const payload = { amount, type: typeTx, description, date, categoryId } as any;
      const res = await fetch(`/api/books/${financeBookId}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed");

      toast.success(t("workspace.quickAddSuccess"));

      const targetBook = books.find((b) => b.id === financeBookId);
      let remaining: number | null = null;

      if (targetBook?.type === "SHARED") {
        try {
          const r = await fetch(`/api/books/${financeBookId}/budgets`);
          if (r.ok) {
            const pb = await r.json();
            const budgets = pb.budgets ?? [];
            const firstBudget = budgets[0];
            if (firstBudget) {
              remaining = Number(firstBudget.amount ?? 0) - Number(firstBudget.spent ?? 0) - Number(amount);
              toast(`${t("workspace.budgetRemaining", { name: firstBudget.name })}: ${remaining.toLocaleString()} ${targetBook.currency}`);
            }
          }
        } catch {
          // ignore
        }
      }

      setSuccessState({
        bookName: targetBook?.name ?? "Book",
        amount: Number(amount || 0),
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

  if (successState) {
    return (
      <div className="fixed inset-0 z-50 bg-[#020817]/95 p-0 sm:p-4">
        <div className="mx-auto flex h-full w-full max-w-md items-center justify-center">
          <div className="w-full rounded-[28px] border border-emerald-500/20 bg-[#0f172a] p-6 shadow-2xl ring-1 ring-white/10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
              <Check size={30} strokeWidth={2.5} />
            </div>

            <div className="mt-5 text-center">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-400">Success</p>
              <h2 className="mt-2 text-2xl font-bold text-white">{t("workspace.quickAddSuccess")}</h2>
              <p className="mt-2 text-sm text-slate-300">
                {successState.amount.toLocaleString()} {successState.currency} · {successState.type === "EXPENSE" ? "Expense" : "Income"}
              </p>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-left">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Book</p>
              <p className="mt-2 text-base font-semibold text-white">{successState.bookName}</p>
              {successState.remaining !== null && (
                <div className="mt-4 rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-300">
                  {t("workspace.budgetRemaining", { name: successState.bookName })}: <span className="font-semibold">{successState.remaining.toLocaleString()} {successState.currency}</span>
                </div>
              )}
            </div>

            <div className="mt-6 grid gap-3">
              <button type="button" onClick={() => router.push("/dashboard")} className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400">
                {t("workspace.openDashboard")}
              </button>
              <button type="button" onClick={() => { setSuccessState(null); setDescription(""); setAmount(0); setCategoryId(null); }} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base font-semibold text-white transition hover:bg-white/10">
                Add another
              </button>
              <button type="button" onClick={() => { window.close?.(); }} className="w-full rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-base font-semibold text-slate-200 transition hover:bg-white/5">
                {t("workspace.closeApp")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#020817]/95 p-0 sm:p-4">
      <div className="mx-auto flex h-full w-full max-w-md flex-col overflow-hidden rounded-none border border-white/10 bg-[#0f172a] shadow-2xl sm:h-[92vh] sm:rounded-[28px]">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-400/80">Quick add</p>
            <h2 className="text-xl font-bold text-white">{t("workspace.quickAddTitle")}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => router.push("/dashboard")} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/10">{t("workspace.openDashboard")}</button>
            <button type="button" aria-label={t("common.close")} onClick={() => { setOpen(false); window.close?.(); }} className="grid size-9 place-items-center rounded-full bg-white/5 text-slate-200 transition hover:bg-white/10">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          <div className="mb-4 flex gap-2 rounded-2xl bg-white/5 p-1">
            <button type="button" onClick={() => setTab("PERSONAL")} className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${tab === "PERSONAL" ? "bg-emerald-500 text-slate-950" : "text-slate-300 hover:bg-white/5"}`}>
              Personal
            </button>
            <button type="button" onClick={() => setTab("SHARED")} className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${tab === "SHARED" ? "bg-emerald-500 text-slate-950" : "text-slate-300 hover:bg-white/5"}`}>
              Shared
            </button>
          </div>

          <form onSubmit={submit} className="grid gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">{t("workspace.transactions.targetBook")}</label>
              <select value={financeBookId ?? ""} onChange={(e) => setFinanceBookId(e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-3 text-base text-white outline-none transition focus:border-emerald-400">
                {books.filter((b) => b.type === tab).map((b) => (
                  <option key={b.id} value={b.id}>{b.name} {b.type === "SHARED" ? `· ${t("common.shared")}` : `· ${t("common.personal")}`}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">{t("workspace.transactions.type")}</label>
              <select value={typeTx} onChange={(e) => setTypeTx(e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-3 text-base text-white outline-none transition focus:border-emerald-400">
                <option value="EXPENSE">Expense</option>
                <option value="INCOME">Income</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">{t("workspace.transactions.amount")}</label>
              <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-3 text-base text-white outline-none transition focus:border-emerald-400" placeholder="0" />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">{t("workspace.transactions.category")}</label>
              <select value={categoryId ?? ""} onChange={(e) => setCategoryId(e.target.value || null)} className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-3 text-base text-white outline-none transition focus:border-emerald-400">
                <option value="">{t("workspace.transactions.noCategory")}</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-3 text-base text-white outline-none transition focus:border-emerald-400" />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[90px] w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-3 text-base text-white outline-none transition focus:border-emerald-400" placeholder="Add notes..." />
            </div>
          </form>
        </div>

        <div className="border-t border-white/10 bg-[#0b1220] px-4 py-4 sm:px-5">
          <button type="button" onClick={() => submit()} disabled={submitting} className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70">
            {submitting ? t("common.loading") : t("workspace.saveTransaction")}
          </button>
        </div>
      </div>
    </div>
  );
}

