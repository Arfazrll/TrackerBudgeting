import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/contexts/language-context";
import { getRequestLocale } from "@/lib/server-locale";
import { resolveTranslation } from "@/lib/translations";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "iaNda", template: "%s | iaNda" },
  description: "Secure personal and shared finance management workspace.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getRequestLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${geist.variable} font-sans antialiased`} suppressHydrationWarning>
        <a href="#main-content" className="skip-link">{resolveTranslation("common.skipToContent", locale)}</a>
        <ThemeProvider>
          <LanguageProvider initialLocale={locale}>
            <div id="main-content" tabIndex={-1}>{children}</div>
            <Toaster richColors position="top-right" />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
