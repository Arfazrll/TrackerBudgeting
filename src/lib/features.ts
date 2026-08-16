import type { UserFeature } from "@prisma/client";
import { redirect } from "next/navigation";
import { AuthError, requirePageUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const OPTIONAL_FEATURES: UserFeature[] = ["BOOKS", "BUDGETING", "PLANNING", "POCKETS", "NOTES"];

export async function getEnabledFeatures(userId: string) {
  const access = await db.userFeatureAccess.findMany({
    where: { userId },
    select: { feature: true },
  });
  return access.map((item) => item.feature);
}

export async function requirePageFeature(feature: UserFeature) {
  const user = await requirePageUser();
  const access = await db.userFeatureAccess.findUnique({
    where: { userId_feature: { userId: user.id, feature } },
    select: { id: true },
  });
  if (!access) redirect("/dashboard");
  return user;
}

export async function requireApiFeature(userId: string, feature: UserFeature) {
  const access = await db.userFeatureAccess.findUnique({
    where: { userId_feature: { userId, feature } },
    select: { id: true },
  });
  if (!access) throw new AuthError("FORBIDDEN", 403);
}
