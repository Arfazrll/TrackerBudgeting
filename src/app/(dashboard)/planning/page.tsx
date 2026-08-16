import { PlanningManager } from "@/components/planning-manager";
import { db } from "@/lib/db";
import { requirePageFeature } from "@/lib/features";

export const metadata = { title: "Financial Planning" };

export default async function PlanningPage() {
  const user = await requirePageFeature("PLANNING");
  const plans = await db.financialPlan.findMany({
    where: { userId: user.id },
    orderBy: [{ status: "asc" }, { deadline: "asc" }, { updatedAt: "desc" }],
  });
  return (
    <PlanningManager
      initialPlans={plans.map((plan) => ({
        id: plan.id,
        title: plan.title,
        description: plan.description,
        targetAmount: Number(plan.targetAmount),
        currentAmount: Number(plan.currentAmount),
        currency: plan.currency,
        deadline: plan.deadline?.toISOString() ?? null,
        status: plan.status,
        priority: plan.priority,
      }))}
    />
  );
}
