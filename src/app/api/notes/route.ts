import { requireUser } from "@/lib/auth";
import { handleRouteError } from "@/lib/api";
import { db } from "@/lib/db";
import { noteSchema } from "@/lib/validations";
import { requireApiFeature } from "@/lib/features";

export async function GET() {
  try {
    const user = await requireUser();
    await requireApiFeature(user.id, "NOTES");
    const notes = await db.note.findMany({
      where: { userId: user.id },
      orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
    });
    return Response.json({ notes });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await requireApiFeature(user.id, "NOTES");
    const input = noteSchema.parse(await request.json());
    const note = await db.note.create({ data: { ...input, userId: user.id } });
    return Response.json({ note }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
