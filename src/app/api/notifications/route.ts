import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { handleRouteError } from "@/lib/api";

export async function GET() {
  try {
    const user = await requireUser();
    const notifications = await db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return Response.json({ notifications });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const input = z.object({ id: z.string().cuid().optional(), all: z.boolean().optional() }).parse(await request.json());
    await db.notification.updateMany({
      where: { userId: user.id, id: input.all ? undefined : input.id },
      data: { isRead: true },
    });
    return Response.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
