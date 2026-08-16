import { NotificationsView } from "@/components/notifications-view";
import { requirePageUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requirePageUser({ allowAdmin: true });
  const notifications = await db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 });

  return (
    <NotificationsView
      notifications={notifications.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
        metadata: typeof item.metadata === "string" ? item.metadata : item.metadata ? String(item.metadata) : null,
      }))}
    />
  );
}
