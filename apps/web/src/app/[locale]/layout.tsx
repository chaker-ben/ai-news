import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { ThemeProvider } from "next-themes";
import { notFound } from "next/navigation";

import { routing } from "@/i18n/routing";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "AI News — Dashboard",
  description: "AI news aggregation and monitoring dashboard",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as "fr" | "en" | "ar")) {
    notFound();
  }

  const isRTL = locale === "ar";
  const messages = await getMessages();

  return (
    <html lang={locale} dir={isRTL ? "rtl" : "ltr"} suppressHydrationWarning>
      <body
        className="antialiased"
        style={{
          fontFamily: isRTL
            ? "var(--font-arabic)"
            : "var(--font-sans)",
        }}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <NextIntlClientProvider messages={messages}>
            {children}
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
