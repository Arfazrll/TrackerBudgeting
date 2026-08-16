import { requireUser } from "@/lib/auth";
import { handleRouteError, jsonError, parseDate, toNumber } from "@/lib/api";
import { db } from "@/lib/db";
import { pocketEntrySchema } from "@/lib/validations";
import { requireApiFeature } from "@/lib/features";

type Context = { params: Promise<{ pocketId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireUser();
    await requireApiFeature(user.id, "POCKETS");
    const { pocketId } = await context.params;
    const input = pocketEntrySchema.parse(await request.json());
    const pocket = await db.pocket.findFirst({
      where: { id: pocketId, userId: user.id },
      include: { entries: { select: { amount: true, type: true } } },
    });
    if (!pocket) return jsonError("Pocket not found.", 404);
    const balance = pocket.entries.reduce(
      (sum, entry) => sum + (entry.type === "DEPOSIT" ? Number(entry.amount) : -Number(entry.amount)),
      0,
    );
    if (input.type === "WITHDRAWAL" && input.amount > balance) {
      return jsonError("Withdrawal exceeds the available pocket balance.", 422);
    }
    const entry = await db.pocketEntry.create({
      data: {
        ...input,
        note: input.note || null,
        date: parseDate(input.date),
        pocketId,
      },
    });
    return Response.json({ entry: toNumber(entry) }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
