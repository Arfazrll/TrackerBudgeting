import { requireUser } from "@/lib/auth";
import { requireBookMember } from "@/lib/access";
import { db } from "@/lib/db";
import { handleRouteError } from "@/lib/api";
import { categorySchema } from "@/lib/validations";

type Context = { params: Promise<{ categoryId: string }> };

async function categoryAccess(categoryId: string, userId: string) {
  const category = await db.category.findUniqueOrThrow({ where: { id: categoryId } });
  await requireBookMember(category.financeBookId, userId);
  return category;
}

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { categoryId } = await context.params;
    await categoryAccess(categoryId, user.id);
    const category = await db.category.update({
      where: { id: categoryId },
      data: categorySchema.partial().parse(await request.json()),
    });
    return Response.json({ category });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_: Request, context: Context) {
  try {
    const user = await requireUser();
    const { categoryId } = await context.params;
    await categoryAccess(categoryId, user.id);
    await db.category.delete({ where: { id: categoryId } });
    return Response.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
