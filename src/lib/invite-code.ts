import { randomBytes } from "crypto";
import { db } from "@/lib/db";

export const INVITE_CODE_TTL_MS = 2 * 60 * 1000;

export function createInviteCode() {
  return randomBytes(5).toString("hex").toUpperCase();
}

export function createInviteCodeExpiry(now = new Date()) {
  return new Date(now.getTime() + INVITE_CODE_TTL_MS);
}

export async function rotateInviteCode(bookId: string) {
  const inviteCode = createInviteCode();
  const inviteCodeExpiresAt = createInviteCodeExpiry();
  await db.financeBook.update({
    where: { id: bookId },
    data: { inviteCode, inviteCodeExpiresAt },
  });
  return { inviteCode, inviteCodeExpiresAt };
}

export async function ensureFreshInviteCode(bookId: string) {
  const now = new Date();
  const book = await db.financeBook.findUniqueOrThrow({
    where: { id: bookId },
    select: { id: true, type: true, inviteCode: true, inviteCodeExpiresAt: true },
  });

  if (book.type !== "SHARED") {
    return { inviteCode: null, inviteCodeExpiresAt: null };
  }
  if (book.inviteCode && book.inviteCodeExpiresAt && book.inviteCodeExpiresAt > now) {
    return { inviteCode: book.inviteCode, inviteCodeExpiresAt: book.inviteCodeExpiresAt };
  }

  return rotateInviteCode(bookId);
}
