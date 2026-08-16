import { requireUser } from "@/lib/auth";
import { handleRouteError, jsonError } from "@/lib/api";
import { db } from "@/lib/db";
import { profileSchema } from "@/lib/validations";

const MAX_AVATAR_BYTES = 512 * 1024;

function avatarSize(dataUrl: string) {
  const encoded = dataUrl.split(",", 2)[1] ?? "";
  const padding = encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0;
  return Math.floor((encoded.length * 3) / 4) - padding;
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const input = profileSchema.parse(await request.json());
    if (input.avatarUrl && avatarSize(input.avatarUrl) > MAX_AVATAR_BYTES) {
      return jsonError("Avatar image must be 512 KB or smaller.", 422);
    }
    const updated = await db.user.update({
      where: { id: user.id },
      data: {
        name: input.name,
        avatarUrl: input.avatarUrl || null,
      },
      select: { id: true, name: true, email: true, role: true, avatarUrl: true },
    });
    return Response.json({ user: updated });
  } catch (error) {
    return handleRouteError(error);
  }
}
