import { requireUser } from "@/lib/auth";
import { requireBookMember } from "@/lib/access";
import { db } from "@/lib/db";
import { handleRouteError, parseDate, toNumber } from "@/lib/api";
import { budgetSchema } from "@/lib/validations";
import { requireApiFeature } from "@/lib/features";
import { getBudgetSpent } from "@/lib/budget-spending";

type Context = { params: Promise<{ bookId: string }> };

export async function GET(_: Request, context: Context) {
  try {
    const user = await requireUser();
    await requireApiFeature(user.id, "BUDGETING");
    const { bookId } = await context.params;
    await requireBookMember(bookId, user.id);
    const budgets = await db.budget.findMany({
      where: { financeBookId: bookId },
      include: { category: true },
      orderBy: { startDate: "desc" },
    });
    const result = await Promise.all(
      budgets.map(async (budget) => {
        const spent = await getBudgetSpent({
          financeBookId: bookId,
          categoryId: budget.categoryId,
          startDate: budget.startDate,
          endDate: budget.endDate,
        });
        return { ...toNumber(budget), spent };
      }),
    );
    return Response.json({ budgets: result });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireUser();
    await requireApiFeature(user.id, "BUDGETING");
    const { bookId } = await context.params;
    await requireBookMember(bookId, user.id);
    const input = budgetSchema.parse(await request.json());
    const budget = await db.budget.create({
      data: {
        ...input,
        startDate: parseDate(input.startDate),
        endDate: parseDate(input.endDate),
        financeBookId: bookId,
      },
      include: { category: true },
    });
    return Response.json({ budget: { ...toNumber(budget), spent: 0 } }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
