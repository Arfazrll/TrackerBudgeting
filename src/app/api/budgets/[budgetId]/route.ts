import { requireUser } from "@/lib/auth";
import { requireBookMember } from "@/lib/access";
import { db } from "@/lib/db";
import { handleRouteError, parseDate, toNumber } from "@/lib/api";
import { budgetSchema } from "@/lib/validations";
import { requireApiFeature } from "@/lib/features";

type Context = { params: Promise<{ budgetId: string }> };

async function budgetAccess(budgetId: string, userId: string) {
  const budget = await db.budget.findUniqueOrThrow({ where: { id: budgetId } });
  await requireBookMember(budget.financeBookId, userId);
  return budget;
}

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireUser();
    await requireApiFeature(user.id, "BUDGETING");
    const { budgetId } = await context.params;
    await budgetAccess(budgetId, user.id);
    const input = budgetSchema.partial().parse(await request.json());
    const budget = await db.budget.update({
      where: { id: budgetId },
      data: {
        ...input,
        startDate: input.startDate ? parseDate(input.startDate) : undefined,
        endDate: input.endDate ? parseDate(input.endDate) : undefined,
      },
      include: { category: true },
    });
    return Response.json({ budget: toNumber(budget) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_: Request, context: Context) {
  try {
    const user = await requireUser();
    await requireApiFeature(user.id, "BUDGETING");
    const { budgetId } = await context.params;
    await budgetAccess(budgetId, user.id);
    await db.budget.delete({ where: { id: budgetId } });
    return Response.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
