export const locales = ["fr", "nl", "en"] as const;

export type Locale = (typeof locales)[number];

export const routing = {
  locales,
  defaultLocale: "fr" as Locale,
  localePrefix: "always" as const,
};

export const defaultLocale = routing.defaultLocale;

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

