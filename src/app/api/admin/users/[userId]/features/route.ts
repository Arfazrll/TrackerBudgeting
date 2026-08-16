import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { handleRouteError, jsonError } from "@/lib/api";
import { db } from "@/lib/db";
import { tServer } from "@/lib/server-locale";

type Context = { params: Promise<{ userId: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    await requireAdmin();
    const { userId } = await context.params;
    const input = z.object({
      feature: z.enum(["BOOKS", "BUDGETING", "PLANNING", "POCKETS", "NOTES"]),
      enabled: z.boolean(),
    }).parse(await request.json());
    const target = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!target) return jsonError(await tServer("api.notFound"), 404);
    if (target.role === "ADMIN") return jsonError(await tServer("api.forbidden"), 422);

    if (input.enabled) {
      await db.userFeatureAccess.upsert({
        where: { userId_feature: { userId, feature: input.feature } },
        update: {},
        create: { userId, feature: input.feature },
      });
    } else {
      await db.userFeatureAccess.deleteMany({ where: { userId, feature: input.feature } });
    }
    const access = await db.userFeatureAccess.findMany({
      where: { userId },
      select: { feature: true },
      orderBy: { feature: "asc" },
    });
    return Response.json({ features: access.map((item) => item.feature) });
  } catch (error) {
    return handleRouteError(error);
  }
}
