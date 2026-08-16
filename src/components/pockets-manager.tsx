"use client";

import {
  Check,
  Home,
  Landmark,
  LoaderCircle,
  Pencil,
  PiggyBank,
  Plane,
  Plus,
  ShieldCheck,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/language-context";
import { formatCurrency, formatDate } from "@/lib/format";

const iconMap = { Wallet, Landmark, PiggyBank, ShieldCheck, Plane, Home };
type PocketIcon = keyof typeof iconMap;

type PocketEntry = {
  id: string;
  amount: number;
  type: "DEPOSIT" | "WITHDRAWAL";
  note: string | null;
  date: string;
};

type Pocket = {
  id: string;
  name: string;
  description: string | null;
  currency: string;
  targetAmount: number | null;
  color: string;
  icon: string;
  isArchived: boolean;
  balance: number;
  entries: PocketEntry[];
};

function localDateValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function PocketsManager({ initialPockets }: { initialPockets: Pocket[] }) {
  const { locale, t } = useLanguage();
  const [pockets, setPockets] = useState(initialPockets);
  const [editing, setEditing] = useState<Pocket | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [entryAction, setEntryAction] = useState<{ pocket: Pocket; type: "DEPOSIT" | "WITHDRAWAL" } | null>(null);
  const [saving, setSaving] = useState(false);

  function openForm(pocket: Pocket | null = null) {
    setEditing(pocket);
    setFormOpen(true);
  }

  async function savePocket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const form = Object.fromEntries(new FormData(event.currentTarget));
    const body = {
      name: form.name,
      description: form.description,
      currency: form.currency,
      targetAmount: form.targetAmount ? Number(form.targetAmount) : null,
      color: form.color,
      icon: form.icon,
      isArchived: editing?.isArchived ?? false,
    };
    try {
      const response = await fetch(editing ? `/api/pockets/${editing.id}` : "/api/pockets", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(t("enterprise.pockets.failure"));
      setPockets((items) => editing
        ? items.map((item) => item.id === editing.id ? { ...item, ...payload.pocket } : item)
        : [payload.pocket, ...items]);
      toast.success(t("enterprise.pockets.success"));
      setFormOpen(false);
      setEditing(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("enterprise.pockets.failure"));
    } finally {
      setSaving(false);
    }
  }

  async function saveEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!entryAction) return;
    setSaving(true);
    const form = Object.fromEntries(new FormData(event.currentTarget));
    const amount = Number(form.amount);
    try {
      const response = await fetch(`/api/pockets/${entryAction.pocket.id}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, type: entryAction.type, note: form.note, date: form.date }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(response.status === 422 ? t("enterprise.pockets.insufficient") : t("enterprise.pockets.failure"));
      }
      setPockets((items) => items.map((item) => item.id === entryAction.pocket.id
        ? {
            ...item,
            balance: item.balance + (entryAction.type === "DEPOSIT" ? amount : -amount),
            entries: [payload.entry, ...item.entries],
          }
        : item));
      toast.success(t("enterprise.pockets.entrySuccess"));
      setEntryAction(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("enterprise.pockets.failure"));
    } finally {
      setSaving(false);
    }
  }

  async function removePocket(pocket: Pocket) {
    if (!window.confirm(t("enterprise.pockets.confirmDelete"))) return;
    const response = await fetch(`/api/pockets/${pocket.id}`, { method: "DELETE" });
    if (!response.ok) return toast.error(t("enterprise.pockets.failure"));
    setPockets((items) => items.filter((item) => item.id !== pocket.id));
    toast.success(t("enterprise.pockets.deleted"));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{t("enterprise.pockets.tag")}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-[-0.04em] sm:text-3xl">{t("enterprise.pockets.title")}</h1>
          <p className="mt-2 text-sm muted">{t("enterprise.pockets.subtitle")}</p>
        </div>
        <button onClick={() => openForm()} className="btn-primary w-full sm:w-auto"><Plus size={17} /> {t("enterprise.pockets.add")}</button>
      </div>

      {pockets.length ? (
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {pockets.map((pocket) => {
            const Icon = iconMap[pocket.icon as PocketIcon] ?? Wallet;
            const progress = pocket.targetAmount ? Math.min(100, Math.round((pocket.balance / pocket.targetAmount) * 100)) : null;
            return (
              <article key={pocket.id} className="card overflow-hidden">
                <div className="h-1.5" style={{ backgroundColor: pocket.color }} />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid size-11 place-items-center rounded-xl text-white" style={{ backgroundColor: pocket.color }}><Icon size={20} /></span>
                    <div className="flex gap-1">
                      <button aria-label={t("common.edit")} onClick={() => openForm(pocket)} className="grid size-10 place-items-center rounded-lg hover:bg-[var(--card-muted)]"><Pencil size={16} /></button>
                      <button aria-label={t("common.delete")} onClick={() => removePocket(pocket)} className="grid size-10 place-items-center rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950"><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <h2 className="mt-4 text-lg font-bold">{pocket.name}</h2>
                  <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 muted">{pocket.description || t("common.noDescription")}</p>
                  <div className="mt-5 rounded-xl bg-[var(--card-muted)] p-4">
                    <p className="text-xs muted">{t("enterprise.pockets.balance")}</p>
                    <p className="mt-1 text-xl font-bold">{formatCurrency(pocket.balance, pocket.currency, locale)}</p>
                    {pocket.targetAmount && progress !== null && (
                      <div className="mt-3">
                        <div className="mb-1.5 flex justify-between text-[0.68rem] muted">
                          <span>{t("enterprise.pockets.target")}: {formatCurrency(pocket.targetAmount, pocket.currency, locale)}</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
                          <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: pocket.color }} />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button onClick={() => setEntryAction({ pocket, type: "DEPOSIT" })} className="btn-primary min-h-11"><Plus size={16} /> {t("enterprise.pockets.deposit")}</button>
                    <button onClick={() => setEntryAction({ pocket, type: "WITHDRAWAL" })} className="btn-secondary min-h-11" disabled={pocket.balance <= 0}>{t("enterprise.pockets.withdraw")}</button>
                  </div>
                  <div className="mt-5 border-t pt-4">
                    <h3 className="text-xs font-bold uppercase tracking-wide muted">{t("enterprise.pockets.activity")}</h3>
                    {pocket.entries.length ? (
                      <div className="mt-2 space-y-1">
                        {pocket.entries.slice(0, 3).map((entry) => (
                          <div key={entry.id} className="flex items-center gap-3 rounded-lg py-2 text-xs">
                            <span className={`grid size-7 place-items-center rounded-lg font-bold ${entry.type === "DEPOSIT" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950" : "bg-red-100 text-red-700 dark:bg-red-950"}`}>
                              {entry.type === "DEPOSIT" ? "+" : "-"}
                            </span>
                            <span className="min-w-0 flex-1"><span className="block truncate">{entry.note || t(`enterprise.pockets.${entry.type === "DEPOSIT" ? "deposit" : "withdraw"}`)}</span><span className="muted">{formatDate(entry.date, locale)}</span></span>
                            <strong>{formatCurrency(entry.amount, pocket.currency, locale)}</strong>
                          </div>
                        ))}
                      </div>
                    ) : <p className="mt-3 text-xs muted">{t("enterprise.pockets.noActivity")}</p>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="card grid min-h-72 place-items-center p-8 text-center">
          <div><PiggyBank className="mx-auto muted" size={36} /><p className="mt-3 text-sm muted">{t("enterprise.pockets.empty")}</p></div>
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
          <div role="dialog" aria-modal="true" className="card max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-b-none p-5 shadow-2xl sm:rounded-2xl sm:p-6">
            <div className="flex items-start justify-between">
              <div><h2 className="text-xl font-bold">{editing ? t("enterprise.pockets.edit") : t("enterprise.pockets.add")}</h2><p className="mt-1 text-sm muted">{t("enterprise.pockets.subtitle")}</p></div>
              <button aria-label={t("common.close")} onClick={() => setFormOpen(false)} className="grid size-10 place-items-center rounded-lg hover:bg-[var(--card-muted)]"><X size={19} /></button>
            </div>
            <form onSubmit={savePocket} className="mt-5 space-y-4">
              <div><label className="label">{t("enterprise.pockets.name")}</label><input aria-label={t("enterprise.pockets.name")} className="input" name="name" defaultValue={editing?.name} minLength={2} maxLength={80} required /></div>
              <div><label className="label">{t("enterprise.pockets.description")}</label><textarea aria-label={t("enterprise.pockets.description")} className="input resize-none" name="description" defaultValue={editing?.description ?? ""} rows={2} maxLength={240} /></div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div><label className="label">{t("common.currency")}</label><select aria-label={t("common.currency")} name="currency" className="input" defaultValue={editing?.currency ?? "IDR"}><option>IDR</option><option>USD</option><option>SGD</option><option>MYR</option></select></div>
                <div><label className="label">{t("enterprise.pockets.target")}</label><input aria-label={t("enterprise.pockets.target")} className="input" name="targetAmount" type="number" min="1" defaultValue={editing?.targetAmount ?? ""} /></div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">{t("enterprise.pockets.icon")}</label>
                  <select aria-label={t("enterprise.pockets.icon")} name="icon" className="input" defaultValue={editing?.icon ?? "Wallet"}>
                    {(Object.keys(iconMap) as PocketIcon[]).map((icon) => <option key={icon} value={icon}>{t(`enterprise.pockets.icons.${icon}`)}</option>)}
                  </select>
                </div>
                <div><label className="label">{t("enterprise.pockets.color")}</label><input aria-label={t("enterprise.pockets.color")} className="input h-11 p-1" name="color" type="color" defaultValue={editing?.color ?? "#10b981"} /></div>
              </div>
              <button disabled={saving} className="btn-primary w-full">{saving ? <LoaderCircle className="animate-spin" size={17} /> : <Check size={17} />} {t("enterprise.pockets.save")}</button>
            </form>
          </div>
        </div>
      )}

      {entryAction && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
          <div role="dialog" aria-modal="true" className="card max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-b-none p-5 shadow-2xl sm:rounded-2xl sm:p-6">
            <div className="flex items-start justify-between">
              <div><h2 className="text-xl font-bold">{t(`enterprise.pockets.${entryAction.type === "DEPOSIT" ? "deposit" : "withdraw"}`)}</h2><p className="mt-1 text-sm muted">{entryAction.pocket.name}</p></div>
              <button aria-label={t("common.close")} onClick={() => setEntryAction(null)} className="grid size-10 place-items-center rounded-lg hover:bg-[var(--card-muted)]"><X size={19} /></button>
            </div>
            <form onSubmit={saveEntry} className="mt-5 space-y-4">
              <div><label className="label">{t("enterprise.pockets.amount")}</label><input aria-label={t("enterprise.pockets.amount")} className="input" name="amount" type="number" min="1" max={entryAction.type === "WITHDRAWAL" ? entryAction.pocket.balance : undefined} required /></div>
              <div><label className="label">{t("enterprise.pockets.note")}</label><input aria-label={t("enterprise.pockets.note")} className="input" name="note" maxLength={240} /></div>
              <div><label className="label">{t("enterprise.pockets.date")}</label><input aria-label={t("enterprise.pockets.date")} className="input" name="date" type="date" defaultValue={localDateValue()} required /></div>
              <button disabled={saving} className="btn-primary w-full">{saving ? <LoaderCircle className="animate-spin" size={17} /> : <Check size={17} />} {t("enterprise.pockets.submitEntry")}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
