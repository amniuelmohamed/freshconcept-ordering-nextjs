import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import createIntlMiddleware from "next-intl/middleware";

import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";
import { getAvailableLocalesArray, getDefaultLocale } from "@/lib/data/settings";

const intlMiddleware = createIntlMiddleware(routing);

export async function proxy(request: NextRequest) {
  // Extract locale from URL path (format: /{locale}/...)
  const pathname = request.nextUrl.pathname;
  const localeMatch = pathname.match(/^\/([^/]+)/);
  const requestedLocale = localeMatch?.[1];

  // Only check locale availability for locale-prefixed paths
  if (requestedLocale && ["fr", "nl", "en"].includes(requestedLocale)) {
    try {
      // Get available locales and default locale from settings
      const [availableLocales, defaultLocale] = await Promise.all([
        getAvailableLocalesArray(),
        getDefaultLocale(),
      ]);

      // Compute a safe fallback locale:
      // - Prefer defaultLocale if it's available
      // - Otherwise fall back to the first available locale
      const fallbackLocale =
        (availableLocales.includes(defaultLocale) ? defaultLocale : availableLocales[0]) ||
        routing.defaultLocale;

      // If requested locale is not available, redirect to fallback locale
      if (!availableLocales.includes(requestedLocale)) {
        const url = request.nextUrl.clone();
        // Replace the locale in the path with the fallback locale
        url.pathname = url.pathname.replace(`/${requestedLocale}`, `/${fallbackLocale}`);
        return NextResponse.redirect(url);
      }
    } catch (error) {
      // If there's an error fetching settings, continue with default behavior
      console.error("Error checking locale availability:", error);
    }
  }

  const intlResponse = intlMiddleware(request);
  const response = await updateSession(request, intlResponse);

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

