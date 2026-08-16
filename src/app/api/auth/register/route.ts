import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { handleRouteError } from "@/lib/api";
import { tServer } from "@/lib/server-locale";
import { registerSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const input = registerSchema.parse(await request.json());
    const passwordHash = await bcrypt.hash(input.password, 12);
    await db.user.create({
      data: { name: input.name, email: input.email, passwordHash },
    });
    return Response.json({ message: await tServer("auth.registerSuccess") }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
