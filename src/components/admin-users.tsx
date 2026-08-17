"use client";

import { Check, Clock3, Eye, EyeOff, LoaderCircle, Plus, Search, Settings2, ShieldCheck, UserPlus, UserRoundCheck, UserRoundX, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/language-context";
import { formatDate, initials } from "@/lib/format";

type Status = "PENDING" | "ACTIVE" | "REJECTED" | "SUSPENDED";
type Feature = "BOOKS" | "BUDGETING" | "PLANNING" | "POCKETS" | "NOTES";
type User = {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  status: Status;
  createdAt: string;
  requirePasswordOnOpen?: boolean;
  _count: { ownedBooks: number; transactions: number };
  features: Feature[];
};

const optionalFeatures: Feature[] = ["BOOKS", "BUDGETING", "PLANNING", "POCKETS", "NOTES"];

const statusStyle: Record<Status, string> = {
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  ACTIVE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  SUSPENDED: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

export function AdminUsers({ initialUsers }: { initialUsers: User[] }) {
  const { locale, t } = useLanguage();
  const [users, setUsers] = useState(initialUsers);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Status | "ALL">("ALL");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [featureUserId, setFeatureUserId] = useState<string | null>(null);
  const [featureLoading, setFeatureLoading] = useState<Feature | null>(null);
  const [requirePasswordLoading, setRequirePasswordLoading] = useState<string | null>(null);


  const filtered = users.filter((user) =>
    `${user.name} ${user.email}`.toLowerCase().includes(query.toLowerCase())
    && (filter === "ALL" || user.status === filter),
  );

  function statusLabel(status: Status | "ALL") {
    return t(`admin.statusLabels.${status}`);
  }

  async function updateStatus(userId: string, status: Status) {
    setLoadingId(userId);
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setUsers((items) => items.map((item) => item.id === userId ? { ...item, status } : item));
      toast.success(t("admin.statusChangeSuccess", { status: statusLabel(status) }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("admin.statusChangeFail"));
    } finally {
      setLoadingId(null);
    }
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setUsers((items) => [{ ...payload.user, features: [] }, ...items]);
      setCreateOpen(false);
      setShowPassword(false);
      toast.success(t("admin.createSuccess"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("admin.createFail"));
    } finally {
      setCreating(false);
    }
  }

  async function toggleFeature(userId: string, feature: Feature, enabled: boolean) {
    setFeatureLoading(feature);
    try {
      const response = await fetch(`/api/admin/users/${userId}/features`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feature, enabled }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setUsers((items) => items.map((item) => item.id === userId ? { ...item, features: payload.features } : item));
      toast.success(t("admin.features.updated"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("admin.features.updateFailed"));
    } finally {
      setFeatureLoading(null);
    }
  }

  async function toggleRequirePassword(userId: string, enabled: boolean) {
    setRequirePasswordLoading(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}/features`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requirePasswordOnOpen: enabled }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setUsers((items) => items.map((item) => item.id === userId ? { ...item, requirePasswordOnOpen: payload.requirePasswordOnOpen } : item));
      toast.success(t("admin.requirePassword.updated"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("admin.requirePassword.updateFailed"));
    } finally {
      setRequirePasswordLoading(null);
    }
  }

  const featureUser = users.find((user) => user.id === featureUserId) ?? null;

  return (
    <>
      <div className="card overflow-hidden">
        <div className="flex flex-col justify-between gap-3 p-4 sm:p-5 lg:flex-row lg:items-center">
          <div>
            <h2 className="font-semibold">{t("admin.usersTitle")}</h2>
            <p className="mt-0.5 text-xs muted">{t("admin.pendingCount", { count: users.filter((user) => user.status === "PENDING").length })}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button onClick={() => setCreateOpen(true)} className="btn-primary whitespace-nowrap"><Plus size={16} /> {t("admin.createUser")}</button>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 muted" size={16} />
                <input aria-label={t("admin.searchPlaceholder")} value={query} onChange={(event) => setQuery(event.target.value)} className="input min-w-0 pl-9 sm:w-64" placeholder={t("admin.searchPlaceholder")} />
              </div>
              <select aria-label={t("admin.allStatuses")} value={filter} onChange={(event) => setFilter(event.target.value as Status | "ALL")} className="input w-32 sm:w-36">
                <option value="ALL">{t("admin.allStatuses")}</option>
                <option value="PENDING">{statusLabel("PENDING")}</option>
                <option value="ACTIVE">{statusLabel("ACTIVE")}</option>
                <option value="REJECTED">{statusLabel("REJECTED")}</option>
                <option value="SUSPENDED">{statusLabel("SUSPENDED")}</option>
              </select>
            </div>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{t("admin.colUser")}</th>
                <th className="hidden sm:table-cell">{t("admin.colRole")}</th>
                <th>{t("admin.colStatus")}</th>
                <th className="hidden lg:table-cell">{t("admin.colActivity")}</th>
                <th className="hidden md:table-cell">{t("admin.colRegistered")}</th>
                <th className="text-right">{t("admin.colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <span className="grid size-8 place-items-center rounded-lg bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-950 sm:size-9">{initials(user.name)}</span>
                      <div><p className="font-semibold">{user.name}</p><p className="text-xs muted">{user.email}</p></div>
                    </div>
                  </td>
                  <td className="hidden sm:table-cell">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold">{user.role === "ADMIN" && <ShieldCheck size={14} />}{user.role === "ADMIN" ? t("common.administrator") : t("common.user")}</span>
                  </td>
                  <td><span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-bold sm:px-2.5 sm:py-1 ${statusStyle[user.status]}`}>{statusLabel(user.status)}</span></td>
                  <td className="hidden lg:table-cell"><p className="text-xs">{t("admin.booksActivity", { b: user._count.ownedBooks, t: user._count.transactions })}</p></td>
                  <td className="hidden whitespace-nowrap md:table-cell">{formatDate(user.createdAt, locale)}</td>
                  <td>
                    <div className="flex justify-end gap-1">
                      {loadingId === user.id ? (
                        <span className="grid size-9 place-items-center"><LoaderCircle className="animate-spin" size={16} /></span>
                      ) : (
                        <>
                          {user.status !== "ACTIVE" && <button aria-label={t("admin.actionsApprove")} title={t("admin.actionsApprove")} onClick={() => updateStatus(user.id, "ACTIVE")} className="grid size-9 place-items-center rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"><UserRoundCheck size={17} /></button>}
                          {user.status !== "REJECTED" && user.role !== "ADMIN" && <button aria-label={t("admin.actionsReject")} title={t("admin.actionsReject")} onClick={() => updateStatus(user.id, "REJECTED")} className="grid size-9 place-items-center rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950"><UserRoundX size={17} /></button>}
                          {user.status === "ACTIVE" && user.role !== "ADMIN" && <button aria-label={t("admin.actionsSuspend")} title={t("admin.actionsSuspend")} onClick={() => updateStatus(user.id, "SUSPENDED")} className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-[var(--card-muted)]"><Clock3 size={17} /></button>}
                          {user.role !== "ADMIN" && (
                            <>
                              <button aria-label={user.requirePasswordOnOpen ? t("admin.requirePassword.revoke") : t("admin.requirePassword.require")} title={user.requirePasswordOnOpen ? t("admin.requirePassword.revoke") : t("admin.requirePassword.require")} onClick={() => toggleRequirePassword(user.id, !user.requirePasswordOnOpen)} className="grid size-9 place-items-center rounded-lg hover:bg-[var(--card-muted)]">
                                {requirePasswordLoading === user.id ? <LoaderCircle className="animate-spin" size={16} /> : (user.requirePasswordOnOpen ? <EyeOff size={17} /> : <Eye size={17} />)}
                              </button>
                              <button aria-label={t("admin.features.manage")} title={t("admin.features.manage")} onClick={() => setFeatureUserId(user.id)} className="grid size-9 place-items-center rounded-lg text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"><Settings2 size={17} /></button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && <div className="grid h-40 place-items-center text-sm muted"><span className="flex items-center gap-2"><Check size={17} /> {t("admin.noMatch")}</span></div>}
        </div>
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
          <div role="dialog" aria-modal="true" className="card max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-b-none p-5 shadow-2xl sm:rounded-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="grid size-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><UserPlus size={18} /></span>
                <h2 className="mt-3 text-xl font-bold">{t("admin.createTitle")}</h2>
                <p className="mt-1 text-sm muted">{t("admin.createSubtitle")}</p>
              </div>
              <button aria-label={t("common.close")} onClick={() => setCreateOpen(false)} className="grid size-10 place-items-center rounded-lg hover:bg-[var(--card-muted)]"><X size={19} /></button>
            </div>
            <form onSubmit={createUser} className="mt-5 space-y-4">
              <div><label className="label" htmlFor="admin-user-name">{t("auth.fullName")}</label><input id="admin-user-name" name="name" className="input" minLength={2} maxLength={80} autoComplete="name" required /></div>
              <div><label className="label" htmlFor="admin-user-email">{t("auth.email")}</label><input id="admin-user-email" name="email" type="email" className="input" maxLength={160} autoComplete="email" required /></div>
              <div>
                <label className="label" htmlFor="admin-user-password">{t("admin.initialPassword")}</label>
                <div className="relative">
                  <input id="admin-user-password" name="password" type={showPassword ? "text" : "password"} className="input pr-12" minLength={8} maxLength={72} autoComplete="new-password" required />
                  <button type="button" aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")} onClick={() => setShowPassword((value) => !value)} className="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-lg muted hover:bg-[var(--card-muted)]">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
                </div>
                <p className="mt-1.5 text-xs muted">{t("admin.passwordHelper")}</p>
              </div>
              <div><label className="label" htmlFor="admin-user-status">{t("admin.colStatus")}</label><select id="admin-user-status" name="status" defaultValue="ACTIVE" className="input"><option value="ACTIVE">{statusLabel("ACTIVE")}</option><option value="PENDING">{statusLabel("PENDING")}</option></select></div>
              <button disabled={creating} className="btn-primary w-full">{creating ? <LoaderCircle className="animate-spin" size={17} /> : <UserPlus size={17} />} {t("admin.createButton")}</button>
            </form>
          </div>
        </div>
      )}

      {featureUser && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
          <div role="dialog" aria-modal="true" className="card max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-b-none p-5 shadow-2xl sm:rounded-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="grid size-10 place-items-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"><Settings2 size={18} /></span>
                <h2 className="mt-3 text-xl font-bold">{t("admin.features.title")}</h2>
                <p className="mt-1 text-sm muted">{t("admin.features.subtitle", { name: featureUser.name })}</p>
              </div>
              <button aria-label={t("common.close")} onClick={() => setFeatureUserId(null)} className="grid size-10 place-items-center rounded-lg hover:bg-[var(--card-muted)]"><X size={19} /></button>
            </div>
            <div className="mt-5 space-y-2">
              {optionalFeatures.map((feature) => {
                const enabled = featureUser.features.includes(feature);
                return (
                  <div key={feature} className="flex items-center gap-4 rounded-xl border p-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{t(`admin.features.labels.${feature}`)}</p>
                      <p className="mt-1 text-xs leading-5 muted">{t(`admin.features.descriptions.${feature}`)}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={enabled}
                      aria-label={t(`admin.features.labels.${feature}`)}
                      disabled={featureLoading === feature}
                      onClick={() => toggleFeature(featureUser.id, feature, !enabled)}
                      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${enabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"}`}
                    >
                      <span className={`absolute left-1 top-1 size-5 rounded-full bg-white shadow-sm transition-transform ${enabled ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 rounded-xl bg-[var(--card-muted)] p-3 text-xs leading-5 muted">{t("admin.features.alwaysAvailable")}</p>
          </div>
        </div>
      )}
    </>
  );
}
