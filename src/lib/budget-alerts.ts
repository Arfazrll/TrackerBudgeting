import { db } from "@/lib/db";
import { getBudgetSpent } from "@/lib/budget-spending";

export async function checkBudgetAlerts(bookId: string) {
  const now = new Date();
  const budgets = await db.budget.findMany({
    where: { financeBookId: bookId, startDate: { lte: now }, endDate: { gte: now } },
    include: { financeBook: { include: { members: true } } },
  });

  for (const budget of budgets) {
    const spent = await getBudgetSpent({
      financeBookId: bookId,
      categoryId: budget.categoryId,
      startDate: budget.startDate,
      endDate: budget.endDate,
    });
    const limit = Number(budget.amount);
    const percent = limit > 0 ? (spent / limit) * 100 : 0;
    if (percent < budget.alertAt) continue;

    const threshold = percent >= 100 ? 100 : budget.alertAt;
    const recipients = new Set([
      budget.financeBook.ownerId,
      ...budget.financeBook.members.map((member) => member.userId),
    ]);
    const metadata = JSON.stringify({
      bookId,
      budgetId: budget.id,
      budgetName: budget.name,
      currency: budget.financeBook.currency,
      limit,
      percent: Math.round(percent),
      threshold,
    });

    await Promise.all(
      [...recipients].map((userId) => {
        const dedupeKey = `budget:${budget.id}:${budget.startDate.toISOString()}:${threshold}`;
        const data = {
          userId,
          title: threshold === 100 ? "BUDGET_EXCEEDED" : "BUDGET_WARNING",
          message: budget.name,
          type: "BUDGET_ALERT" as const,
          metadata,
          dedupeKey,
        };
        return db.notification.upsert({
          where: { userId_dedupeKey: { userId, dedupeKey } },
          update: { title: data.title, message: data.message, metadata },
          create: data,
        });
      }),
    );
  }
}
