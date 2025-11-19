import { getRequestConfig } from "next-intl/server";

import { defaultLocale as fallbackLocale, isLocale } from "./routing";
import { getDefaultLocale } from "@/lib/data/settings";

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale;
  
  // Get default locale from settings, fallback to hardcoded default
  // During static generation, settings may not be accessible (no cookies)
  let defaultLocaleFromSettings: string;
  try {
    defaultLocaleFromSettings = await getDefaultLocale();
  } catch (error) {
    // During build/static generation, this is expected - use fallback
    // Only log as warning to reduce noise during build
    if (process.env.NODE_ENV === "development") {
      console.warn("Could not fetch default locale from settings during build, using fallback:", error);
    }
    defaultLocaleFromSettings = fallbackLocale;
  }

  const resolvedLocale =
    locale && isLocale(locale) ? locale : (isLocale(defaultLocaleFromSettings) ? defaultLocaleFromSettings : fallbackLocale);

  return {
    locale: resolvedLocale,
    messages: (await import(`../messages/${resolvedLocale}.json`)).default,
  };
});

