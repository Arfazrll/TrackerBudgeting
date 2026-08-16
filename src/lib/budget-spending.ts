import { db } from "@/lib/db";

type BudgetRange = {
  financeBookId: string;
  categoryId: string | null;
  startDate: Date;
  endDate: Date;
};

export async function getBudgetSpent({
  financeBookId,
  categoryId,
  startDate,
  endDate,
}: BudgetRange) {
  const aggregate = await db.transaction.aggregate({
    where: {
      financeBookId,
      type: "EXPENSE",
      categoryId: categoryId ?? undefined,
      OR: [
        {
          accountingPeriodStart: { gte: startDate, lte: endDate },
          accountingPeriodEnd: { gte: startDate, lte: endDate },
        },
        {
          accountingPeriodStart: null,
          date: { gte: startDate, lte: endDate },
        },
      ],
    },
    _sum: { amount: true },
  });

  return Number(aggregate._sum.amount ?? 0);
}
