import { BooksManager } from "@/components/books-manager";
import { requirePageUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePageFeature } from "@/lib/features";

export async function FinanceBooksPage({ type }: { type?: "PERSONAL" | "SHARED" }) {
  const user = type ? await requirePageUser() : await requirePageFeature("BOOKS");
  const books = await db.financeBook.findMany({
    where: {
      members: { some: { userId: user.id } },
      type,
    },
    include: {
      owner: { select: { id: true, name: true } },
      members: { select: { id: true } },
      transactions: { select: { amount: true, type: true } },
      _count: { select: { categories: true, transactions: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <BooksManager
      scope={type}
      books={books.map(({ transactions, ...book }) => ({
        ...book,
        inviteCodeExpiresAt: book.inviteCodeExpiresAt?.toISOString() ?? null,
        balance: transactions.reduce(
          (sum, transaction) => sum + (transaction.type === "INCOME" ? Number(transaction.amount) : -Number(transaction.amount)),
          0,
        ),
      }))}
    />
  );
}
