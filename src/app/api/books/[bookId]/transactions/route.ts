import { requireUser } from "@/lib/auth";
import { requireBookMember } from "@/lib/access";
import { checkBudgetAlerts } from "@/lib/budget-alerts";
import { db } from "@/lib/db";
import { handleRouteError, parseDate, toNumber } from "@/lib/api";
import { tServer } from "@/lib/server-locale";
import { transactionSchema } from "@/lib/validations";

type Context = { params: Promise<{ bookId: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { bookId } = await context.params;
    await requireBookMember(bookId, user.id);
    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const type = url.searchParams.get("type");
    const transactions = await db.transaction.findMany({
      where: {
        financeBookId: bookId,
        type: type === "INCOME" || type === "EXPENSE" ? type : undefined,
        date: from || to ? { gte: from ? parseDate(from) : undefined, lte: to ? parseDate(to) : undefined } : undefined,
      },
      include: {
        category: true,
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });
    return Response.json({ transactions: transactions.map(toNumber) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { bookId } = await context.params;
    await requireBookMember(bookId, user.id);
    const input = transactionSchema.parse(await request.json());
    if (input.categoryId) {
      const category = await db.category.findFirst({ where: { id: input.categoryId, financeBookId: bookId } });
      if (!category) return Response.json({ error: await tServer("api.invalidCategory") }, { status: 422 });
    }
    const transaction = await db.transaction.create({
      data: {
        ...input,
        description: input.description || null,
        date: parseDate(input.date),
        dateKnown: true,
        originalDateText: input.date,
        financeBookId: bookId,
        createdById: user.id,
      },
      include: { category: true, createdBy: { select: { id: true, name: true } } },
    });
    if (input.type === "EXPENSE") await checkBudgetAlerts(bookId);
    return Response.json({ transaction: toNumber(transaction) }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
