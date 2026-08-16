"use client";

import { NotificationsList } from "@/components/notifications-list";
import { useLanguage } from "@/contexts/language-context";

export function NotificationsView({ notifications }: { notifications: Array<{ id: string; title: string; message: string; type: "BUDGET_ALERT" | "SYSTEM" | "INVITE" | "APPROVAL"; isRead: boolean; createdAt: string; metadata: string | null }> }) {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{t("notifications.pageTag")}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-[-0.04em]">{t("notifications.title")}</h1>
        <p className="mt-2 text-sm muted">{t("notifications.subtitle")}</p>
      </div>
      <NotificationsList initialNotifications={notifications} />
    </div>
  );
}
