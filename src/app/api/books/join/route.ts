import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { handleRouteError, jsonError } from "@/lib/api";
import { tServer } from "@/lib/server-locale";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { inviteCode } = z.object({ inviteCode: z.string().trim().length(10).toUpperCase() }).parse(await request.json());
    const book = await db.financeBook.findUnique({ where: { inviteCode } });
    if (!book || book.type !== "SHARED" || !book.inviteCodeExpiresAt || book.inviteCodeExpiresAt <= new Date()) {
      return jsonError(await tServer("api.invalidInviteCode"), 404);
    }
    await db.financeBookMember.upsert({
      where: { financeBookId_userId: { financeBookId: book.id, userId: user.id } },
      update: {},
      create: { financeBookId: book.id, userId: user.id },
    });
    return Response.json({ bookId: book.id, bookName: book.name });
  } catch (error) {
    return handleRouteError(error);
  }
}
