import { requireUser } from "@/lib/auth";
import { handleRouteError, jsonError, parseDate } from "@/lib/api";
import { db } from "@/lib/db";
import { financialPlanSchema } from "@/lib/validations";
import { requireApiFeature } from "@/lib/features";

function serializePlan<T extends { targetAmount: unknown; currentAmount: unknown }>(plan: T) {
  return {
    ...plan,
    targetAmount: Number(plan.targetAmount),
    currentAmount: Number(plan.currentAmount),
  };
}

type Context = { params: Promise<{ planId: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireUser();
    await requireApiFeature(user.id, "PLANNING");
    const { planId } = await context.params;
    const input = financialPlanSchema.partial().parse(await request.json());
    const owned = await db.financialPlan.findFirst({ where: { id: planId, userId: user.id } });
    if (!owned) return jsonError("Plan not found.", 404);
    const plan = await db.financialPlan.update({
      where: { id: planId },
      data: {
        ...input,
        description: input.description === undefined ? undefined : input.description || null,
        deadline:
          input.deadline === undefined ? undefined : input.deadline ? parseDate(input.deadline) : null,
      },
    });
    return Response.json({ plan: serializePlan(plan) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_: Request, context: Context) {
  try {
    const user = await requireUser();
    await requireApiFeature(user.id, "PLANNING");
    const { planId } = await context.params;
    const result = await db.financialPlan.deleteMany({ where: { id: planId, userId: user.id } });
    if (!result.count) return jsonError("Plan not found.", 404);
    return Response.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
