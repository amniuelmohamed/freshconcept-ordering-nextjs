import { getRequestConfig } from "next-intl/server";

import { defaultLocale as fallbackLocale, isLocale } from "./routing";
import { getDefaultLocale } from "@/lib/data/settings";

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale;
  
  // Get default locale from settings, fallback to hardcoded default
  let defaultLocaleFromSettings: string;
  try {
    defaultLocaleFromSettings = await getDefaultLocale();
  } catch (error) {
    console.error("Error fetching default locale from settings:", error);
    defaultLocaleFromSettings = fallbackLocale;
  }

  const resolvedLocale =
    locale && isLocale(locale) ? locale : (isLocale(defaultLocaleFromSettings) ? defaultLocaleFromSettings : fallbackLocale);

  return {
    locale: resolvedLocale,
    messages: (await import(`../messages/${resolvedLocale}.json`)).default,
  };
});

