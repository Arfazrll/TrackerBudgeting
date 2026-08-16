import { AuthError } from "@/lib/auth";
import { db } from "@/lib/db";

export async function requireBookMember(bookId: string, userId: string) {
  const membership = await db.financeBookMember.findUnique({
    where: { financeBookId_userId: { financeBookId: bookId, userId } },
    include: { financeBook: true },
  });
  if (!membership) throw new AuthError("FORBIDDEN", 403);
  return membership;
}

export async function requireBookOwner(bookId: string, userId: string) {
  const book = await db.financeBook.findUnique({ where: { id: bookId } });
  if (!book) throw new AuthError("NOT_FOUND", 404);
  if (book.ownerId !== userId) throw new AuthError("FORBIDDEN", 403);
  return book;
}
