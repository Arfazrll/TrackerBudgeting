import { AppShell } from "@/components/app-shell";
import { requirePageUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser({ allowAdmin: true });
  const [unread, featureAccess] = await Promise.all([
    db.notification.count({ where: { userId: user.id, isRead: false } }),
    db.userFeatureAccess.findMany({ where: { userId: user.id }, select: { feature: true } }),
  ]);
  return <AppShell user={user} unread={unread} features={featureAccess.map((item) => item.feature)}>{children}</AppShell>;
}
