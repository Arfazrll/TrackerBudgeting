import { requireUser } from "@/lib/auth";
import { requireBookMember, requireBookOwner } from "@/lib/access";
import { db } from "@/lib/db";
import { handleRouteError } from "@/lib/api";
import { bookSchema } from "@/lib/validations";
import { createInviteCode, createInviteCodeExpiry, ensureFreshInviteCode } from "@/lib/invite-code";

type Context = { params: Promise<{ bookId: string }> };

export async function GET(_: Request, context: Context) {
  try {
    const user = await requireUser();
    const { bookId } = await context.params;
    await requireBookMember(bookId, user.id);
    const book = await db.financeBook.findUniqueOrThrow({
      where: { id: bookId },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });
    const invite = await ensureFreshInviteCode(bookId);
    return Response.json({ book: { ...book, ...invite } });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { bookId } = await context.params;
    const current = await requireBookOwner(bookId, user.id);
    const input = bookSchema.partial().parse(await request.json());
    const inviteCode =
      input.type === "SHARED" && !current.inviteCode
        ? createInviteCode()
        : input.type === "PERSONAL"
          ? null
          : undefined;
    const inviteCodeExpiresAt =
      input.type === "SHARED" && !current.inviteCode
        ? createInviteCodeExpiry()
        : input.type === "PERSONAL"
          ? null
          : undefined;
    const book = await db.financeBook.update({ where: { id: bookId }, data: { ...input, inviteCode, inviteCodeExpiresAt } });
    return Response.json({ book });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_: Request, context: Context) {
  try {
    const user = await requireUser();
    const { bookId } = await context.params;
    await requireBookOwner(bookId, user.id);
    await db.financeBook.delete({ where: { id: bookId } });
    return Response.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
