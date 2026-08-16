import { DashboardView } from "@/components/dashboard-view";
import { requirePageUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getEnabledFeatures } from "@/lib/features";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requirePageUser();
  const enabledFeatures = await getEnabledFeatures(user.id);
  const hasFeature = (feature: "BOOKS" | "BUDGETING" | "PLANNING" | "POCKETS" | "NOTES") => enabledFeatures.includes(feature);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const sixMonthsStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const memberships = await db.financeBookMember.findMany({
    where: { userId: user.id },
    include: { financeBook: true },
  });
  const books = memberships
    .map((membership) => membership.financeBook)
    .sort((first, second) => second.updatedAt.getTime() - first.updatedAt.getTime());
  const allBookIds = books.map((book) => book.id);
  const currency = books.find((book) => book.type === "PERSONAL")?.currency ?? books[0]?.currency ?? "IDR";
  const reportingBooks = books.filter((book) => book.currency === currency);
  const reportingBookIds = reportingBooks.map((book) => book.id);
  const personalIds = reportingBooks.filter((book) => book.type === "PERSONAL").map((book) => book.id);
  const sharedIds = reportingBooks.filter((book) => book.type === "SHARED").map((book) => book.id);

  const [balanceGroups, trendTransactions, monthTransactions, recentTransactions, activeBudgets, pockets, plans] = await Promise.all([
    db.transaction.groupBy({
      by: ["financeBookId", "type"],
      where: { financeBookId: { in: reportingBookIds } },
      _sum: { amount: true },
    }),
    db.transaction.findMany({
      where: { financeBookId: { in: reportingBookIds }, date: { gte: sixMonthsStart } },
      select: { financeBookId: true, amount: true, type: true, date: true },
    }),
    db.transaction.findMany({
      where: { financeBookId: { in: reportingBookIds }, date: { gte: monthStart } },
      select: {
        amount: true,
        type: true,
        financeBookId: true,
        category: { select: { id: true, name: true } },
      },
    }),
    db.transaction.findMany({
      where: { financeBookId: { in: allBookIds } },
      include: { category: true, financeBook: true },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 8,
    }),
    db.budget.findMany({
      where: {
        financeBook: { members: { some: { userId: user.id } } },
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: { financeBook: { select: { id: true, name: true, currency: true } } },
    }),
    db.pocket.findMany({
      where: { userId: user.id, isArchived: false },
      include: { entries: { select: { amount: true, type: true } } },
    }),
    db.financialPlan.findMany({
      where: { userId: user.id, status: { in: ["ACTIVE", "PAUSED"] } },
      orderBy: [{ priority: "desc" }, { deadline: "asc" }],
      take: 4,
    }),
  ]);

  const firstBudgetStart = activeBudgets.reduce<Date | null>((earliest, budget) => !earliest || budget.startDate < earliest ? budget.startDate : earliest, null);
  const lastBudgetEnd = activeBudgets.reduce<Date | null>((latest, budget) => !latest || budget.endDate > latest ? budget.endDate : latest, null);
  const budgetExpenses = activeBudgets.length && firstBudgetStart && lastBudgetEnd
    ? await db.transaction.findMany({
        where: {
          financeBookId: { in: [...new Set(activeBudgets.map((budget) => budget.financeBookId))] },
          type: "EXPENSE",
          date: { gte: firstBudgetStart, lte: lastBudgetEnd },
        },
        select: { financeBookId: true, categoryId: true, amount: true, date: true },
      })
    : [];

  function balanceFor(bookIds: string[]) {
    return balanceGroups
      .filter((group) => bookIds.includes(group.financeBookId))
      .reduce((sum, group) => sum + (group.type === "INCOME" ? Number(group._sum.amount ?? 0) : -Number(group._sum.amount ?? 0)), 0);
  }

  function monthlyFor(bookIds: string[]) {
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
      const transactions = trendTransactions.filter((transaction) =>
        bookIds.includes(transaction.financeBookId)
        && transaction.date.getMonth() === date.getMonth()
        && transaction.date.getFullYear() === date.getFullYear());
      return {
        date: date.toISOString(),
        income: transactions.filter((transaction) => transaction.type === "INCOME").reduce((sum, transaction) => sum + Number(transaction.amount), 0),
        expense: transactions.filter((transaction) => transaction.type === "EXPENSE").reduce((sum, transaction) => sum + Number(transaction.amount), 0),
      };
    });
  }

  const monthIncome = monthTransactions.filter((transaction) => transaction.type === "INCOME").reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const monthExpense = monthTransactions.filter((transaction) => transaction.type === "EXPENSE").reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const pocketBalance = pockets
    .filter((pocket) => pocket.currency === currency)
    .flatMap((pocket) => pocket.entries)
    .reduce((sum, entry) => sum + (entry.type === "DEPOSIT" ? Number(entry.amount) : -Number(entry.amount)), 0);

  const budgets = activeBudgets.map((budget) => {
    const spent = budgetExpenses
      .filter((transaction) =>
        transaction.financeBookId === budget.financeBookId
        && transaction.date >= budget.startDate
        && transaction.date <= budget.endDate
        && (!budget.categoryId || transaction.categoryId === budget.categoryId))
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
    return {
      id: budget.id,
      name: budget.name,
      bookName: budget.financeBook.name,
      bookId: budget.financeBook.id,
      currency: budget.financeBook.currency,
      amount: Number(budget.amount),
      spent,
      alertAt: budget.alertAt,
    };
  }).sort((a, b) => (b.spent / b.amount) - (a.spent / a.amount)).slice(0, 4);

  const recommendations: Array<{ key: string; href: string; tone: "warning" | "positive" | "neutral" }> = [];
  if (!books.some((book) => book.type === "PERSONAL")) recommendations.push({ key: "enterprise.dashboard.noPersonal", href: "/books/personal", tone: "neutral" });
  if (!books.some((book) => book.type === "SHARED")) recommendations.push({ key: "enterprise.dashboard.noShared", href: "/books/shared", tone: "neutral" });
  if (hasFeature("PLANNING") && !plans.length) recommendations.push({ key: "enterprise.dashboard.noPlans", href: "/planning", tone: "neutral" });
  if (hasFeature("POCKETS") && !pockets.length) recommendations.push({ key: "enterprise.dashboard.noPockets", href: "/pockets", tone: "neutral" });
  if (hasFeature("BUDGETING") && budgets.some((budget) => budget.spent / budget.amount * 100 >= budget.alertAt)) recommendations.push({ key: "enterprise.dashboard.actionBudget", href: "/budgeting", tone: "warning" });
  if (hasFeature("POCKETS") && monthIncome > monthExpense && pockets.length) recommendations.push({ key: "enterprise.dashboard.actionSave", href: "/pockets", tone: "positive" });
  if (monthTransactions.some((transaction) => transaction.type === "EXPENSE")) recommendations.push({ key: "enterprise.dashboard.actionExpense", href: "/books/personal", tone: "neutral" });
  if (!recommendations.length) recommendations.push({ key: "enterprise.dashboard.actionHealthy", href: "/books/personal", tone: "positive" });

  return (
    <DashboardView
      userName={user.name}
      features={enabledFeatures}
      currency={currency}
      personalBalance={balanceFor(personalIds)}
      sharedBalance={balanceFor(sharedIds)}
      pocketBalance={pocketBalance}
      savingsRate={monthIncome > 0 ? ((monthIncome - monthExpense) / monthIncome) * 100 : 0}
      personalBookCount={books.filter((book) => book.type === "PERSONAL").length}
      sharedBookCount={books.filter((book) => book.type === "SHARED").length}
      personalMonthly={monthlyFor(personalIds)}
      sharedMonthly={monthlyFor(sharedIds)}
      budgets={budgets}
      plans={plans.map((plan) => ({
        id: plan.id,
        title: plan.title,
        currency: plan.currency,
        currentAmount: Number(plan.currentAmount),
        targetAmount: Number(plan.targetAmount),
      }))}
      recommendations={recommendations.slice(0, 4)}
      transactionBooks={books.map((book) => ({
        id: book.id,
        name: book.name,
        type: book.type,
        currency: book.currency,
      }))}
      recentTransactions={recentTransactions.map((transaction) => ({
        id: transaction.id,
        amount: Number(transaction.amount),
        type: transaction.type,
        description: transaction.description,
        date: transaction.date.toISOString(),
        categoryName: transaction.category?.name ?? null,
        bookName: transaction.financeBook.name,
        bookId: transaction.financeBook.id,
        bookCurrency: transaction.financeBook.currency,
        bookType: transaction.financeBook.type,
      }))}
    />
  );
}
