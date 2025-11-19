import type { Locale } from "@/i18n/routing";

type TranslationObject = Record<string, string | null | undefined> | null | undefined;

export function getLocalizedField(
  field: TranslationObject,
  locale: Locale,
  fallbackOrder: Locale[] = ["fr", "en", "nl"],
) {
  if (!field) {
    return "";
  }

  const localized = field[locale];
  if (localized) {
    return localized;
  }

  for (const candidate of fallbackOrder) {
    const value = field[candidate];
    if (value) {
      return value;
    }
  }

  const firstAvailable = Object.values(field).find(
    (value): value is string => Boolean(value),
  );

  return firstAvailable ?? "";
}

