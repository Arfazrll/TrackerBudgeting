"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/language-context";
import { formatDate } from "@/lib/format";

function todayInput(date = new Date()){ const local = new Date(date.getTime() - date.getTimezoneOffset()*60_000); return local.toISOString().slice(0,10);}

type Book = { id: string; name: string; type: "PERSONAL" | "SHARED"; currency: string };

type Category = { id: string; name: string };

export default function QuickAddModal({ initialType }: { initialType?: "PERSONAL" | "SHARED" }) {
  const { t } = useLanguage();
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<"PERSONAL" | "SHARED">(initialType ?? "PERSONAL");

  // form state
  const [amount, setAmount] = useState(0);
  const [typeTx, setTypeTx] = useState("EXPENSE");
  const [financeBookId, setFinanceBookId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [date, setDate] = useState(todayInput(new Date()));
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/books");
        if (!res.ok) return;
        const payload = await res.json();
        setBooks(payload.books ?? []);
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    // fetch categories for selected book when changed
    (async () => {
      if (!financeBookId) return;
      try {
        const res = await fetch(`/api/books/${financeBookId}/categories`);
        if (!res.ok) return;
        const payload = await res.json();
        setCategories(payload.categories ?? []);
      } catch (e) {
        // ignore
      }
    })();
  }, [financeBookId]);

  useEffect(() => {
    // pick default book for current tab
    const pick = books.find((b) => b.type === tab) ?? books[0];
    setFinanceBookId(pick?.id ?? null);
  }, [books, tab]);

  async function submit(e?: FormEvent) {
    if (e) e.preventDefault();
    if (!financeBookId) return toast.error(t("workspace.selectBookFirst"));
    setSubmitting(true);
    try {
      const payload = {
        amount: amount,
        type: typeTx,
        description,
        date,
        categoryId,
      } as any;
      const res = await fetch(`/api/books/${financeBookId}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed");

      // show success toast
      toast.success(t("workspace.quickAddSuccess"));

      // if shared book, fetch budgets and show remaining budget info if any
      const targetBook = books.find((b) => b.id === financeBookId);
      if (targetBook?.type === "SHARED") {
        try {
          const r = await fetch(`/api/books/${financeBookId}/budgets`);
          if (r.ok) {
            const pb = await r.json();
            const budgets = pb.budgets ?? [];
            if (budgets.length) {
              // show first budget remaining (simple heuristic)
              const b0 = budgets[0];
              // budgets from API should include amount and spent; compute remaining
              const remaining = Number(b0.amount) - Number(b0.spent ?? 0) - Number(amount);
              toast(`${t("workspace.budgetRemaining", { name: b0.name })}: ${remaining.toLocaleString()} ${targetBook.currency}`);
            }
          }
        } catch (err) {
          // ignore budget fetch errors
        }
      }

      // keep modal open or close? close after success
      setOpen(false);
      // navigate to dashboard if user wants
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4">
      <div className="card max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-b-none p-5 shadow-2xl sm:rounded-2xl sm:p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold sm:text-xl">{t("workspace.quickAddTitle")}</h2>
            <p className="mt-1 text-sm muted">{t("workspace.quickAddDesc")}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { window.close?.(); }} title={t("workspace.closeApp")} className="btn-ghost">{t("workspace.closeApp")}</button>
            <button aria-label={t("common.close")} onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-lg hover:bg-[var(--card-muted)]"><X size={19} /></button>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex gap-2">
            <button onClick={() => setTab("PERSONAL")} className={`flex-1 btn ${tab === "PERSONAL" ? "btn-primary" : "btn-outline"}`}>Personal</button>
            <button onClick={() => setTab("SHARED") } className={`flex-1 btn ${tab === "SHARED" ? "btn-primary" : "btn-outline"}`}>Shared</button>
          </div>

          <form onSubmit={submit} className="mt-4 grid gap-3">
            <div>
              <label className="text-xs muted">{t("workspace.transactions.targetBook")}</label>
              <select value={financeBookId ?? ""} onChange={(e) => setFinanceBookId(e.target.value)} className="input w-full">
                {books.filter(b => b.type === tab).map(b => (
                  <option key={b.id} value={b.id}>{b.name} {b.type === "SHARED" ? `· ${t("common.shared")}` : `· ${t("common.personal")}`}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs muted">{t("workspace.transactions.type")}</label>
              <select value={typeTx} onChange={(e) => setTypeTx(e.target.value)} className="input w-full">
                <option value="EXPENSE">Expense</option>
                <option value="INCOME">Income</option>
              </select>
            </div>

            <div>
              <label className="text-xs muted">{t("workspace.transactions.amount")}</label>
              <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="input w-full" />
            </div>

            <div>
              <label className="text-xs muted">{t("workspace.transactions.category")}</label>
              <select value={categoryId ?? ""} onChange={(e) => setCategoryId(e.target.value || null)} className="input w-full">
                <option value="">{t("workspace.transactions.noCategory")}</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs muted">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input w-full" />
            </div>

            <div>
              <label className="text-xs muted">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input w-full" />
            </div>

            <div className="flex items-center gap-2">
              <button type="submit" disabled={submitting} className="btn-primary flex-1">{t("workspace.saveTransaction")}</button>
              <button type="button" onClick={() => router.push('/dashboard')} className="btn-outline">Open dashboard</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
