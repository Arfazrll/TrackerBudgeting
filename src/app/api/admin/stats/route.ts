import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { handleRouteError } from "@/lib/api";

export async function GET() {
  try {
    await requireAdmin();
    const [users, pending, books, transactions] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { status: "PENDING" } }),
      db.financeBook.count(),
      db.transaction.count(),
    ]);
    return Response.json({ stats: { users, pending, books, transactions } });
  } catch (error) {
    return handleRouteError(error);
  }
}
