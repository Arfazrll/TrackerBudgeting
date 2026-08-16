import { requireUser } from "@/lib/auth";
import { handleRouteError, jsonError } from "@/lib/api";
import { db } from "@/lib/db";
import { pocketSchema } from "@/lib/validations";
import { requireApiFeature } from "@/lib/features";

type Context = { params: Promise<{ pocketId: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireUser();
    await requireApiFeature(user.id, "POCKETS");
    const { pocketId } = await context.params;
    const input = pocketSchema.partial().parse(await request.json());
    const owned = await db.pocket.findFirst({ where: { id: pocketId, userId: user.id } });
    if (!owned) return jsonError("Pocket not found.", 404);
    const pocket = await db.pocket.update({
      where: { id: pocketId },
      data: {
        ...input,
        description: input.description === undefined ? undefined : input.description || null,
        targetAmount: input.targetAmount === undefined ? undefined : input.targetAmount,
      },
    });
    return Response.json({
      pocket: {
        ...pocket,
        targetAmount: pocket.targetAmount === null ? null : Number(pocket.targetAmount),
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_: Request, context: Context) {
  try {
    const user = await requireUser();
    await requireApiFeature(user.id, "POCKETS");
    const { pocketId } = await context.params;
    const result = await db.pocket.deleteMany({ where: { id: pocketId, userId: user.id } });
    if (!result.count) return jsonError("Pocket not found.", 404);
    return Response.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
