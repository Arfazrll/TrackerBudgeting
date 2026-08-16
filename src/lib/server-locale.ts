import { cookies } from "next/headers";
import { normalizeLocale, resolveTranslation, type Locale } from "@/lib/translations";

export const LOCALE_STORAGE_KEY = "IANDA_LOCALE";
export const LOCALE_COOKIE_KEY = "IANDA_LOCALE";

export async function getRequestLocale(): Promise<Locale> {
  const store = await cookies();
  return normalizeLocale(store.get(LOCALE_COOKIE_KEY)?.value ?? store.get("ianda_locale")?.value);
}

export async function tServer(key: string, params?: Record<string, string | number>) {
  return resolveTranslation(key, await getRequestLocale(), params);
}
