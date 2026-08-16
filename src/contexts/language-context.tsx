"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { resolveTranslation, type Locale } from "@/lib/translations";

type LanguageContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextType | null>(null);
const LOCALE_KEY = "IANDA_LOCALE";

export function LanguageProvider({ children, initialLocale = "en" }: { children: React.ReactNode; initialLocale?: Locale }) {
  // initialLocale is resolved server-side from the IANDA_LOCALE cookie by getRequestLocale().
  // No localStorage effect needed — the cookie already provides the correct initial value
  // on first render, eliminating the setState-in-effect anti-pattern.
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  // Persist preference whenever locale changes.
  useEffect(() => {
    localStorage.setItem(LOCALE_KEY, locale);
    document.cookie = `${LOCALE_KEY}=${locale};path=/;max-age=31536000`;
    document.documentElement.lang = locale;
  }, [locale]);

  const t = useMemo(
    () => (key: string, params?: Record<string, string | number>) => resolveTranslation(key, locale, params),
    [locale],
  );

  return <LanguageContext.Provider value={{ locale, setLocale: setLocaleState, t }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}
