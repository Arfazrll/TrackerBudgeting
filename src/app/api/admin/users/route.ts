import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { handleRouteError, jsonError } from "@/lib/api";
import { tServer } from "@/lib/server-locale";
import { adminCreateUserSchema } from "@/lib/validations";

export async function GET() {
  try {
    await requireAdmin();
    const users = await db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        _count: { select: { ownedBooks: true, transactions: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return Response.json({ users });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const input = adminCreateUserSchema.parse(await request.json());
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await db.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: "USER",
        status: input.status,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        _count: { select: { ownedBooks: true, transactions: true } },
      },
    });
    return Response.json({ user }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin();
    const input = z.object({
      userId: z.string().cuid(),
      status: z.enum(["PENDING", "ACTIVE", "REJECTED", "SUSPENDED"]),
    }).parse(await request.json());
    if (input.userId === admin.id && input.status !== "ACTIVE") {
      return jsonError(await tServer("admin.selfDemoteError"), 422);
    }
    const user = await db.user.update({
      where: { id: input.userId },
      data: {
        status: input.status,
        notifications:
          input.status === "ACTIVE"
            ? {
                create: {
                  title: "APPROVAL",
                  message: "ACCOUNT_APPROVED",
                  type: "APPROVAL",
                  metadata: JSON.stringify({ kind: "ACCOUNT_APPROVED" }),
                },
              }
            : undefined,
      },
      select: { id: true, status: true },
    });
    return Response.json({ user });
  } catch (error) {
    return handleRouteError(error);
  }
}
