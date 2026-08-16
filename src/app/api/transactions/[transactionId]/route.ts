import { requireUser } from "@/lib/auth";
import { requireBookMember } from "@/lib/access";
import { checkBudgetAlerts } from "@/lib/budget-alerts";
import { db } from "@/lib/db";
import { handleRouteError, parseDate, toNumber } from "@/lib/api";
import { tServer } from "@/lib/server-locale";
import { transactionSchema } from "@/lib/validations";

type Context = { params: Promise<{ transactionId: string }> };

async function transactionAccess(transactionId: string, userId: string) {
  const transaction = await db.transaction.findUniqueOrThrow({ where: { id: transactionId } });
  await requireBookMember(transaction.financeBookId, userId);
  return transaction;
}

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { transactionId } = await context.params;
    const current = await transactionAccess(transactionId, user.id);
    const input = transactionSchema.partial().parse(await request.json());
    if (input.categoryId) {
      const valid = await db.category.findFirst({ where: { id: input.categoryId, financeBookId: current.financeBookId } });
      if (!valid) return Response.json({ error: await tServer("api.invalidCategory") }, { status: 422 });
    }
    const transaction = await db.transaction.update({
      where: { id: transactionId },
      data: {
        ...input,
        date: input.date ? parseDate(input.date) : undefined,
        dateKnown: input.date ? true : undefined,
        originalDateText: input.date ?? undefined,
      },
      include: { category: true, createdBy: { select: { id: true, name: true } } },
    });
    await checkBudgetAlerts(current.financeBookId);
    return Response.json({ transaction: toNumber(transaction) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_: Request, context: Context) {
  try {
    const user = await requireUser();
    const { transactionId } = await context.params;
    const current = await transactionAccess(transactionId, user.id);
    await db.transaction.delete({ where: { id: transactionId } });
    await checkBudgetAlerts(current.financeBookId);
    return Response.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
