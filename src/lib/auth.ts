import { Role, UserStatus } from "@prisma/client";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth as getOAuthSession } from "@/auth";
import { db } from "@/lib/db";

const SESSION_COOKIE = "ianda_session";
const SESSION_DURATION = 60 * 60 * 24 * 7;

type SessionPayload = {
  userId: string;
  role: Role;
};

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    throw new Error("AUTH_SECRET must contain at least 32 characters.");
  }
  return new TextEncoder().encode(value);
}

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(secret());
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DURATION,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

async function decodeSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.userId !== "string" || (payload.role !== "USER" && payload.role !== "ADMIN")) return null;
    return { userId: payload.userId, role: payload.role };
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const session = await decodeSession();
  const oauthSession = session ? null : await getOAuthSession();
  const userId = session?.userId ?? oauthSession?.user?.id;
  if (!userId) return null;
  return db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, status: true, avatarUrl: true },
  });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user || user.status !== UserStatus.ACTIVE) throw new AuthError("UNAUTHORIZED", 401);
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== Role.ADMIN) throw new AuthError("FORBIDDEN", 403);
  return user;
}

export async function requirePageUser({ allowAdmin = false }: { allowAdmin?: boolean } = {}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.status !== UserStatus.ACTIVE) redirect("/login?reason=inactive");
  if (user.role === Role.ADMIN && !allowAdmin) redirect("/admin");
  return user;
}

export async function requirePageAdmin() {
  const user = await requirePageUser({ allowAdmin: true });
  if (user.role !== Role.ADMIN) redirect("/dashboard");
  return user;
}

export class AuthError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}
