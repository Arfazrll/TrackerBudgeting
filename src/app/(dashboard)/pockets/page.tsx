import { PocketsManager } from "@/components/pockets-manager";
import { db } from "@/lib/db";
import { requirePageFeature } from "@/lib/features";

export const metadata = { title: "Pockets" };

export default async function PocketsPage() {
  const user = await requirePageFeature("POCKETS");
  const pockets = await db.pocket.findMany({
    where: { userId: user.id, isArchived: false },
    include: { entries: { orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: 50 } },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <PocketsManager
      initialPockets={pockets.map((pocket) => ({
        id: pocket.id,
        name: pocket.name,
        description: pocket.description,
        currency: pocket.currency,
        targetAmount: pocket.targetAmount === null ? null : Number(pocket.targetAmount),
        color: pocket.color,
        icon: pocket.icon,
        isArchived: pocket.isArchived,
        balance: pocket.entries.reduce(
          (sum, entry) => sum + (entry.type === "DEPOSIT" ? Number(entry.amount) : -Number(entry.amount)),
          0,
        ),
        entries: pocket.entries.map((entry) => ({
          id: entry.id,
          amount: Number(entry.amount),
          type: entry.type,
          note: entry.note,
          date: entry.date.toISOString(),
        })),
      }))}
    />
  );
}
