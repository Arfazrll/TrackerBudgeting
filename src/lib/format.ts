import { localeToIntl, type Locale } from "@/lib/translations";

export function formatCurrency(amount: number, currency = "IDR", locale: Locale = "en") {
  return new Intl.NumberFormat(localeToIntl(locale), {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "IDR" ? 0 : 2,
  }).format(amount);
}

export function formatDate(date: string | Date, locale: Locale = "en") {
  return new Intl.DateTimeFormat(localeToIntl(locale), { day: "2-digit", month: "short", year: "numeric" }).format(new Date(date));
}

export function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}
