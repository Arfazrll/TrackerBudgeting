"use client";

import { BellRing, CheckCheck, CircleAlert, Info, UserRoundCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/language-context";
import { formatCurrency, formatDate } from "@/lib/format";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: "BUDGET_ALERT" | "SYSTEM" | "INVITE" | "APPROVAL";
  isRead: boolean;
  createdAt: string;
  metadata: string | null;
};

type BudgetMetadata = {
  budgetName?: string;
  limit?: number;
  currency?: string;
  percent?: number;
  threshold?: number;
};

function parseMetadata(metadata: string | null): BudgetMetadata {
  if (!metadata) return {};
  try {
    return JSON.parse(metadata) as BudgetMetadata;
  } catch {
    return {};
  }
}

export function NotificationsList({ initialNotifications }: { initialNotifications: Notification[] }) {
  const { locale, t } = useLanguage();
  const [notifications, setNotifications] = useState(initialNotifications);

  async function markRead(id?: string) {
    const response = await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(id ? { id } : { all: true }) });
    if (!response.ok) return toast.error(t("notifications.markFail"));
    setNotifications((items) => items.map((item) => !id || item.id === id ? { ...item, isRead: true } : item));
  }

  function content(item: Notification) {
    const metadata = parseMetadata(item.metadata);
    if (item.type === "APPROVAL") {
      return {
        title: t("notifications.messages.approvalTitle"),
        message: t("notifications.messages.approvalBody"),
      };
    }
    if (item.type === "BUDGET_ALERT" && metadata.budgetName) {
      return metadata.threshold === 100
        ? {
            title: t("notifications.messages.budgetExceededTitle"),
            message: t("notifications.messages.budgetExceededBody", {
              name: metadata.budgetName,
              limit: formatCurrency(metadata.limit ?? 0, metadata.currency ?? "IDR", locale),
            }),
          }
        : {
            title: t("notifications.messages.budgetWarningTitle"),
            message: t("notifications.messages.budgetWarningBody", {
              name: metadata.budgetName,
              percent: metadata.percent ?? 0,
            }),
          };
    }
    return { title: item.title, message: item.message };
  }

  const icons = { BUDGET_ALERT: CircleAlert, SYSTEM: Info, INVITE: BellRing, APPROVAL: UserRoundCheck };

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between p-5">
        <div>
          <h2 className="font-semibold">{t("notifications.allTitle")}</h2>
          <p className="mt-1 text-xs muted">{t("notifications.unreadCount", { count: notifications.filter((item) => !item.isRead).length })}</p>
        </div>
        <button onClick={() => markRead()} className="btn-secondary min-h-9 py-2 text-xs">
          <CheckCheck size={15} /> {t("notifications.markAllRead")}
        </button>
      </div>
      {notifications.length ? notifications.map((item) => {
        const Icon = icons[item.type];
        const resolved = content(item);
        return (
          <button key={item.id} onClick={() => !item.isRead && markRead(item.id)} className={`flex w-full items-start gap-4 border-t px-5 py-4 text-left hover:bg-[var(--card-muted)] ${!item.isRead ? "bg-emerald-50/60 dark:bg-emerald-950/15" : ""}`}>
            <span className={`mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl ${item.type === "BUDGET_ALERT" ? "bg-orange-100 text-orange-700 dark:bg-orange-950" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950"}`}>
              <Icon size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="text-sm font-semibold">{resolved.title}</span>
                {!item.isRead && <span className="size-2 rounded-full bg-emerald-500" />}
              </span>
              <span className="mt-1 block text-sm leading-6 muted">{resolved.message}</span>
              <span className="mt-1 block text-xs muted">{formatDate(item.createdAt, locale)}</span>
            </span>
          </button>
        );
      }) : <div className="grid min-h-64 place-items-center p-8 text-center"><div><BellRing className="mx-auto muted" size={30} /><p className="mt-3 text-sm muted">{t("notifications.noNotifications")}</p></div></div>}
    </div>
  );
}
