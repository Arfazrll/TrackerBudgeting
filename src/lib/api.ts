import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { AuthError } from "@/lib/auth";
import { getRequestLocale } from "@/lib/server-locale";
import { resolveTranslation } from "@/lib/translations";

export function jsonError(message: string, status: number, details?: unknown) {
  return Response.json({ error: message, details }, { status });
}

export async function handleRouteError(error: unknown) {
  console.error(error);
  const locale = await getRequestLocale();
  const translate = (key: string) => resolveTranslation(key, locale);

  if (error instanceof AuthError) {
    if (error.message === "UNAUTHORIZED") return jsonError(translate("api.unauthorized"), error.status);
    if (error.message === "FORBIDDEN") return jsonError(translate("api.forbidden"), error.status);
    if (error.message === "NOT_FOUND") return jsonError(translate("api.notFound"), error.status);
    return jsonError(error.message, error.status);
  }
  if (error instanceof ZodError) {
    const invalidRange = error.issues.some((issue) => issue.message === "Tanggal selesai harus setelah tanggal mulai.");
    return jsonError(translate(invalidRange ? "api.invalidDateRange" : "api.invalidData"), 422, error.flatten());
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return jsonError(translate("api.duplicate"), 409);
    if (error.code === "P2025") return jsonError(translate("api.notFound"), 404);
  }
  return jsonError(translate("api.serverError"), 500);
}

export function parseDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date");
  return date;
}

export function toNumber<T extends { amount: unknown }>(item: T) {
  return { ...item, amount: Number(item.amount) };
}
