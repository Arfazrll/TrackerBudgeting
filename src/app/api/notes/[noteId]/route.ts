import { requireUser } from "@/lib/auth";
import { handleRouteError, jsonError } from "@/lib/api";
import { db } from "@/lib/db";
import { noteSchema } from "@/lib/validations";
import { requireApiFeature } from "@/lib/features";

type Context = { params: Promise<{ noteId: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireUser();
    await requireApiFeature(user.id, "NOTES");
    const { noteId } = await context.params;
    const input = noteSchema.partial().parse(await request.json());
    const owned = await db.note.findFirst({ where: { id: noteId, userId: user.id } });
    if (!owned) return jsonError("Note not found.", 404);
    const note = await db.note.update({ where: { id: noteId }, data: input });
    return Response.json({ note });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_: Request, context: Context) {
  try {
    const user = await requireUser();
    await requireApiFeature(user.id, "NOTES");
    const { noteId } = await context.params;
    const result = await db.note.deleteMany({ where: { id: noteId, userId: user.id } });
    if (!result.count) return jsonError("Note not found.", 404);
    return Response.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
