import bcrypt from "bcryptjs";
import { createSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { handleRouteError, jsonError } from "@/lib/api";
import { tServer } from "@/lib/server-locale";
import { loginSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const input = loginSchema.parse(await request.json());
    const user = await db.user.findUnique({ where: { email: input.email } });
    if (!user?.passwordHash || !(await bcrypt.compare(input.password, user.passwordHash))) {
      return jsonError(await tServer("auth.wrongCredentials"), 401);
    }
    if (user.status === "PENDING") return jsonError(await tServer("auth.pendingError"), 403);
    if (user.status === "REJECTED") return jsonError(await tServer("auth.rejectedError"), 403);
    if (user.status === "SUSPENDED") return jsonError(await tServer("auth.suspendedError"), 403);
    await createSession({ userId: user.id, role: user.role });
    return Response.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    return handleRouteError(error);
  }
}
