import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";

import { getMessages } from "@/i18n/messages";
import { isLocale, locales } from "@/i18n/routing";
import { getAvailableLocalesArray, getDefaultLocale } from "@/lib/data/settings";
import { Toaster } from "@/components/ui/sonner";

type LocaleLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  // Enforce available_locales from settings at layout level as an extra safety net.
  // If the requested locale is not available, redirect to a safe fallback.
  // Use try/catch to handle cases where settings can't be accessed during static generation
  let availableLocales: string[];
  let defaultLocale: string;
  
  try {
    [availableLocales, defaultLocale] = await Promise.all([
      getAvailableLocalesArray(),
      getDefaultLocale(),
    ]);
  } catch (error) {
    // During static generation, settings may not be accessible (no cookies)
    // Use fallback values - all locales are available, use hardcoded default
    console.warn("Could not fetch settings during build, using fallbacks:", error);
    availableLocales = [...locales];
    defaultLocale = locales[0];
  }

  if (!availableLocales.includes(locale)) {
    const fallbackLocale =
      (availableLocales.includes(defaultLocale) ? defaultLocale : availableLocales[0]) ||
      locales[0];

    redirect(`/${fallbackLocale}`);
  }

  const messages = await getMessages(locale);

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="flex min-h-dvh flex-col">
        {children}
        <Toaster position="top-right" richColors closeButton />
      </div>
    </NextIntlClientProvider>
  );
}

