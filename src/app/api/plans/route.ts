import { requireUser } from "@/lib/auth";
import { handleRouteError, parseDate } from "@/lib/api";
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

export async function GET() {
  try {
    const user = await requireUser();
    await requireApiFeature(user.id, "PLANNING");
    const plans = await db.financialPlan.findMany({
      where: { userId: user.id },
      orderBy: [{ status: "asc" }, { deadline: "asc" }, { updatedAt: "desc" }],
    });
    return Response.json({
      plans: plans.map(serializePlan),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await requireApiFeature(user.id, "PLANNING");
    const input = financialPlanSchema.parse(await request.json());
    const plan = await db.financialPlan.create({
      data: {
        ...input,
        description: input.description || null,
        deadline: input.deadline ? parseDate(input.deadline) : null,
        userId: user.id,
      },
    });
    return Response.json(
      { plan: serializePlan(plan) },
      { status: 201 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
