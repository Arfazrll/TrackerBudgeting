"use client";

import { CalendarDays, Check, LoaderCircle, Pencil, Plus, Target, Trash2, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/language-context";
import { formatCurrency, formatDate } from "@/lib/format";

type Plan = {
  id: string;
  title: string;
  description: string | null;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  deadline: string | null;
  status: "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH";
};

const priorityTone = {
  LOW: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  MEDIUM: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  HIGH: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

export function PlanningManager({ initialPlans }: { initialPlans: Plan[] }) {
  const { locale, t } = useLanguage();
  const [plans, setPlans] = useState(initialPlans);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  function showForm(plan: Plan | null = null) {
    setEditing(plan);
    setOpen(true);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const form = Object.fromEntries(new FormData(event.currentTarget));
    const body = {
      ...form,
      targetAmount: Number(form.targetAmount),
      currentAmount: Number(form.currentAmount),
      deadline: form.deadline || null,
    };
    try {
      const response = await fetch(editing ? `/api/plans/${editing.id}` : "/api/plans", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? t("enterprise.planning.failure"));
      setPlans((items) => editing
        ? items.map((item) => item.id === editing.id ? payload.plan : item)
        : [payload.plan, ...items]);
      toast.success(t("enterprise.planning.success"));
      setOpen(false);
      setEditing(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("enterprise.planning.failure"));
    } finally {
      setSaving(false);
    }
  }

  async function remove(plan: Plan) {
    if (!window.confirm(t("enterprise.planning.confirmDelete"))) return;
    const response = await fetch(`/api/plans/${plan.id}`, { method: "DELETE" });
    if (!response.ok) return toast.error(t("enterprise.planning.failure"));
    setPlans((items) => items.filter((item) => item.id !== plan.id));
    toast.success(t("enterprise.planning.deleted"));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{t("enterprise.planning.tag")}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-[-0.04em] sm:text-3xl">{t("enterprise.planning.title")}</h1>
          <p className="mt-2 text-sm muted">{t("enterprise.planning.subtitle")}</p>
        </div>
        <button onClick={() => showForm()} className="btn-primary w-full sm:w-auto"><Plus size={17} /> {t("enterprise.planning.add")}</button>
      </div>
      {plans.length ? (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => {
            const percent = Math.min(100, Math.round((plan.currentAmount / plan.targetAmount) * 100));
            return (
              <article key={plan.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-11 place-items-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><Target size={20} /></span>
                  <div className="flex items-center gap-1">
                    <span className={`mr-1 rounded-full px-2.5 py-1 text-[0.65rem] font-bold ${priorityTone[plan.priority]}`}>
                      {t(`enterprise.planning.priorities.${plan.priority}`)}
                    </span>
                    <button aria-label={t("common.edit")} onClick={() => showForm(plan)} className="grid size-9 place-items-center rounded-lg hover:bg-[var(--card-muted)]"><Pencil size={15} /></button>
                    <button aria-label={t("common.delete")} onClick={() => remove(plan)} className="grid size-9 place-items-center rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950"><Trash2 size={15} /></button>
                  </div>
                </div>
                <h2 className="mt-4 font-bold">{plan.title}</h2>
                <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 muted">{plan.description || t("common.noDescription")}</p>
                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="font-semibold">{formatCurrency(plan.currentAmount, plan.currency, locale)}</span>
                    <span className="muted">{t("enterprise.planning.progress", { percent })}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--card-muted)]">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${percent}%` }} />
                  </div>
                  <div className="mt-2 flex justify-between text-xs muted">
                    <span>{t("enterprise.planning.target")}: {formatCurrency(plan.targetAmount, plan.currency, locale)}</span>
                    <span>{t(`enterprise.planning.statuses.${plan.status}`)}</span>
                  </div>
                </div>
                {plan.deadline && (
                  <div className="mt-4 flex items-center gap-2 border-t pt-4 text-xs muted"><CalendarDays size={15} /> {formatDate(plan.deadline, locale)}</div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="card grid min-h-72 place-items-center p-8 text-center">
          <div><Target className="mx-auto muted" size={34} /><p className="mt-3 text-sm muted">{t("enterprise.planning.empty")}</p></div>
        </div>
      )}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
          <div className="card max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-b-none p-5 shadow-2xl sm:rounded-2xl sm:p-6">
            <div className="flex items-start justify-between">
              <div><h2 className="text-xl font-bold">{editing ? t("enterprise.planning.edit") : t("enterprise.planning.add")}</h2><p className="mt-1 text-sm muted">{t("enterprise.planning.subtitle")}</p></div>
              <button aria-label={t("common.close")} onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-lg hover:bg-[var(--card-muted)]"><X size={19} /></button>
            </div>
            <form onSubmit={submit} className="mt-5 space-y-4">
              <div><label className="label">{t("enterprise.planning.name")}</label><input aria-label={t("enterprise.planning.name")} name="title" defaultValue={editing?.title} className="input" required maxLength={100} /></div>
              <div><label className="label">{t("enterprise.planning.description")}</label><textarea aria-label={t("enterprise.planning.description")} name="description" defaultValue={editing?.description ?? ""} className="input resize-none" rows={2} maxLength={500} /></div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div><label className="label">{t("enterprise.planning.target")}</label><input aria-label={t("enterprise.planning.target")} name="targetAmount" type="number" min="1" defaultValue={editing?.targetAmount} className="input" required /></div>
                <div><label className="label">{t("enterprise.planning.current")}</label><input aria-label={t("enterprise.planning.current")} name="currentAmount" type="number" min="0" defaultValue={editing?.currentAmount ?? 0} className="input" required /></div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div><label className="label">{t("common.currency")}</label><select aria-label={t("common.currency")} name="currency" defaultValue={editing?.currency ?? "IDR"} className="input"><option>IDR</option><option>USD</option><option>SGD</option><option>MYR</option></select></div>
                <div><label className="label">{t("enterprise.planning.deadline")}</label><input aria-label={t("enterprise.planning.deadline")} name="deadline" type="date" defaultValue={editing?.deadline?.slice(0, 10)} className="input" /></div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div><label className="label">{t("enterprise.planning.priority")}</label><select aria-label={t("enterprise.planning.priority")} name="priority" defaultValue={editing?.priority ?? "MEDIUM"} className="input">{(["LOW", "MEDIUM", "HIGH"] as const).map((value) => <option key={value} value={value}>{t(`enterprise.planning.priorities.${value}`)}</option>)}</select></div>
                <div><label className="label">{t("enterprise.planning.status")}</label><select aria-label={t("enterprise.planning.status")} name="status" defaultValue={editing?.status ?? "ACTIVE"} className="input">{(["ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"] as const).map((value) => <option key={value} value={value}>{t(`enterprise.planning.statuses.${value}`)}</option>)}</select></div>
              </div>
              <button disabled={saving} className="btn-primary w-full">{saving ? <LoaderCircle className="animate-spin" size={17} /> : <Check size={17} />} {t("enterprise.planning.save")}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
