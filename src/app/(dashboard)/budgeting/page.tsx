import { BudgetingOverview } from "@/components/budgeting-overview";
import { db } from "@/lib/db";
import { requirePageFeature } from "@/lib/features";

export const metadata = { title: "Budgeting" };

export default async function BudgetingPage() {
  const user = await requirePageFeature("BUDGETING");
  const now = new Date();
  const budgets = await db.budget.findMany({
    where: {
      financeBook: { members: { some: { userId: user.id } } },
      startDate: { lte: now },
      endDate: { gte: now },
    },
    include: {
      category: { select: { name: true } },
      financeBook: { select: { id: true, name: true, type: true, currency: true } },
    },
    orderBy: { endDate: "asc" },
  });

  const firstStart = budgets.reduce<Date | null>((earliest, budget) => !earliest || budget.startDate < earliest ? budget.startDate : earliest, null);
  const lastEnd = budgets.reduce<Date | null>((latest, budget) => !latest || budget.endDate > latest ? budget.endDate : latest, null);
  const expenses = budgets.length && firstStart && lastEnd
    ? await db.transaction.findMany({
        where: {
          financeBookId: { in: [...new Set(budgets.map((budget) => budget.financeBookId))] },
          type: "EXPENSE",
          date: { gte: firstStart, lte: lastEnd },
        },
        select: { financeBookId: true, categoryId: true, amount: true, date: true },
      })
    : [];

  return (
    <BudgetingOverview
      budgets={budgets.map((budget) => ({
        id: budget.id,
        name: budget.name,
        amount: Number(budget.amount),
        spent: expenses
          .filter((transaction) =>
            transaction.financeBookId === budget.financeBookId
            && transaction.date >= budget.startDate
            && transaction.date <= budget.endDate
            && (!budget.categoryId || transaction.categoryId === budget.categoryId))
          .reduce((sum, transaction) => sum + Number(transaction.amount), 0),
        alertAt: budget.alertAt,
        startDate: budget.startDate.toISOString(),
        endDate: budget.endDate.toISOString(),
        categoryName: budget.category?.name ?? null,
        book: budget.financeBook,
      }))}
    />
  );
}
