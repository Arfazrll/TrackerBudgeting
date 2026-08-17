import { AdminView } from "@/components/admin-view";
import { requirePageAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  await requirePageAdmin();
  const [users, userCount, pending, books, transactions] = await Promise.all([
    db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        requirePasswordOnOpen: true,
        featureAccess: { select: { feature: true } },
        _count: { select: { ownedBooks: true, transactions: true } },
      },
      orderBy: [{ status: "desc" }, { createdAt: "desc" }],
    }),
    db.user.count(),
    db.user.count({ where: { status: "PENDING" } }),
    db.financeBook.count(),
    db.transaction.count(),
  ]);

  return (
    <AdminView
      stats={{ users: userCount, pending, books, transactions }}
      users={users.map(({ featureAccess, ...user }) => ({
        ...user,
        createdAt: user.createdAt.toISOString(),
        features: featureAccess.map((item) => item.feature),
      }))}
    />
  );
}
