import { requireUser } from "@/lib/auth";
import { requireBookMember } from "@/lib/access";
import { handleRouteError, jsonError } from "@/lib/api";
import { ensureFreshInviteCode, rotateInviteCode } from "@/lib/invite-code";
import { tServer } from "@/lib/server-locale";

type Context = { params: Promise<{ bookId: string }> };

export async function POST(_: Request, context: Context) {
  try {
    const user = await requireUser();
    const { bookId } = await context.params;
    const membership = await requireBookMember(bookId, user.id);
    if (membership.financeBook.type !== "SHARED") {
      return jsonError(await tServer("api.sharedBookRequired"), 409);
    }
    const invite = await ensureFreshInviteCode(bookId);
    return Response.json({
      inviteCode: invite.inviteCode,
      inviteCodeExpiresAt: invite.inviteCodeExpiresAt?.toISOString() ?? null,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(_: Request, context: Context) {
  try {
    const user = await requireUser();
    const { bookId } = await context.params;
    const membership = await requireBookMember(bookId, user.id);
    if (membership.financeBook.type !== "SHARED") {
      return jsonError(await tServer("api.sharedBookRequired"), 409);
    }
    const invite = await rotateInviteCode(bookId);
    return Response.json({
      inviteCode: invite.inviteCode,
      inviteCodeExpiresAt: invite.inviteCodeExpiresAt.toISOString(),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
