import { requireUser } from "@/lib/auth";
import { requireBookMember } from "@/lib/access";
import { db } from "@/lib/db";
import { handleRouteError } from "@/lib/api";
import { categorySchema } from "@/lib/validations";

type Context = { params: Promise<{ bookId: string }> };

export async function GET(_: Request, context: Context) {
  try {
    const user = await requireUser();
    const { bookId } = await context.params;
    await requireBookMember(bookId, user.id);
    const categories = await db.category.findMany({
      where: { financeBookId: bookId },
      include: { _count: { select: { transactions: true } } },
      orderBy: { name: "asc" },
    });
    return Response.json({ categories });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { bookId } = await context.params;
    await requireBookMember(bookId, user.id);
    const input = categorySchema.parse(await request.json());
    const category = await db.category.create({ data: { ...input, financeBookId: bookId } });
    return Response.json({ category }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
