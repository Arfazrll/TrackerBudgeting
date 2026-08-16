import { requireUser } from "@/lib/auth";
import { handleRouteError } from "@/lib/api";
import { db } from "@/lib/db";
import { pocketSchema } from "@/lib/validations";
import { requireApiFeature } from "@/lib/features";

function serializePocket<T extends { targetAmount: unknown; entries: Array<{ amount: unknown; type: string }> }>(
  pocket: T,
) {
  return {
    ...pocket,
    targetAmount: pocket.targetAmount === null ? null : Number(pocket.targetAmount),
    balance: pocket.entries.reduce(
      (sum, entry) => sum + (entry.type === "DEPOSIT" ? Number(entry.amount) : -Number(entry.amount)),
      0,
    ),
    entries: pocket.entries.map((entry) => ({ ...entry, amount: Number(entry.amount) })),
  };
}

export async function GET() {
  try {
    const user = await requireUser();
    await requireApiFeature(user.id, "POCKETS");
    const pockets = await db.pocket.findMany({
      where: { userId: user.id },
      include: { entries: { orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: 50 } },
      orderBy: [{ isArchived: "asc" }, { updatedAt: "desc" }],
    });
    return Response.json({ pockets: pockets.map(serializePocket) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await requireApiFeature(user.id, "POCKETS");
    const input = pocketSchema.parse(await request.json());
    const pocket = await db.pocket.create({
      data: {
        ...input,
        description: input.description || null,
        targetAmount: input.targetAmount ?? null,
        userId: user.id,
      },
      include: { entries: true },
    });
    return Response.json({ pocket: serializePocket(pocket) }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
