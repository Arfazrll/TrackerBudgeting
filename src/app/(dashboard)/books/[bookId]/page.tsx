import { notFound } from "next/navigation";
import { BookWorkspace } from "@/components/book-workspace";
import { requirePageUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureFreshInviteCode } from "@/lib/invite-code";
import { getBudgetSpent } from "@/lib/budget-spending";

type Props = {
  params: Promise<{ bookId: string }>;
  searchParams: Promise<{ action?: string | string[] }>;
};

export default async function BookPage({ params, searchParams }: Props) {
  const user = await requirePageUser();
  const { bookId } = await params;
  const { action } = await searchParams;
  const membership = await db.financeBookMember.findUnique({
    where: { financeBookId_userId: { financeBookId: bookId, userId: user.id } },
  });
  if (!membership) notFound();
  const [book, categories, transactions, budgetRecords, budgetingAccess] = await Promise.all([
    db.financeBook.findUnique({
      where: { id: bookId },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: { include: { user: { select: { id: true, name: true, email: true } } }, orderBy: { joinedAt: "asc" } },
      },
    }),
    db.category.findMany({ where: { financeBookId: bookId }, include: { _count: { select: { transactions: true } } }, orderBy: { name: "asc" } }),
    db.transaction.findMany({
      where: { financeBookId: bookId },
      include: { category: { include: { _count: { select: { transactions: true } } } }, createdBy: { select: { id: true, name: true } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
    db.budget.findMany({ where: { financeBookId: bookId }, include: { category: { include: { _count: { select: { transactions: true } } } } }, orderBy: { startDate: "desc" } }),
    db.userFeatureAccess.findUnique({
      where: { userId_feature: { userId: user.id, feature: "BUDGETING" } },
      select: { id: true },
    }),
  ]);
  if (!book) notFound();
  const invite = await ensureFreshInviteCode(book.id);
  const budgets = await Promise.all(budgetRecords.map(async (budget) => {
    const spent = await getBudgetSpent({
      financeBookId: bookId,
      categoryId: budget.categoryId,
      startDate: budget.startDate,
      endDate: budget.endDate,
    });
    return { ...budget, amount: Number(budget.amount), spent, startDate: budget.startDate.toISOString(), endDate: budget.endDate.toISOString() };
  }));
  return (
    <BookWorkspace
      userId={user.id}
      budgetingEnabled={Boolean(budgetingAccess)}
      openTransactionOnLoad={action === "add-transaction"}
      initialBook={{
        id: book.id,
        name: book.name,
        description: book.description,
        type: book.type,
        currency: book.currency,
        inviteCode: invite.inviteCode,
        inviteCodeExpiresAt: invite.inviteCodeExpiresAt?.toISOString() ?? null,
        ownerId: book.ownerId,
        owner: book.owner,
        members: book.members.map((member) => ({ ...member, joinedAt: member.joinedAt.toISOString() })),
      }}
      initialCategories={categories}
      initialTransactions={transactions.map((tx) => ({
        id: tx.id,
        amount: Number(tx.amount),
        type: tx.type,
        description: tx.description,
        date: tx.date.toISOString(),
        dateKnown: tx.dateKnown,
        originalDateText: tx.originalDateText,
        accountingPeriodStart: tx.accountingPeriodStart?.toISOString() ?? null,
        accountingPeriodEnd: tx.accountingPeriodEnd?.toISOString() ?? null,
        categoryId: tx.categoryId,
        category: tx.category,
        createdBy: tx.createdBy,
      }))}
      initialBudgets={budgets}
    />
  );
}
