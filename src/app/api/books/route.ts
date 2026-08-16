import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { handleRouteError } from "@/lib/api";
import { bookSchema } from "@/lib/validations";
import { createInviteCode, createInviteCodeExpiry } from "@/lib/invite-code";

export async function GET() {
  try {
    const user = await requireUser();
    const books = await db.financeBook.findMany({
      where: { members: { some: { userId: user.id } } },
      include: {
        owner: { select: { id: true, name: true } },
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        transactions: { select: { amount: true, type: true } },
        _count: { select: { categories: true, transactions: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
    return Response.json({
      books: books.map(({ transactions, ...book }) => ({
        ...book,
        balance: transactions.reduce(
          (sum, tx) => sum + (tx.type === "INCOME" ? Number(tx.amount) : -Number(tx.amount)),
          0,
        ),
      })),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = bookSchema.parse(await request.json());
    const shared = input.type === "SHARED";
    const book = await db.financeBook.create({
      data: {
        ...input,
        description: input.description || null,
        ownerId: user.id,
        inviteCode: shared ? createInviteCode() : null,
        inviteCodeExpiresAt: shared ? createInviteCodeExpiry() : null,
        members: { create: { userId: user.id, role: "OWNER" } },
      },
    });
    return Response.json({ book }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
