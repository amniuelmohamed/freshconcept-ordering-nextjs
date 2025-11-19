"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

import { routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const localeLabels: Record<Locale, string> = {
  fr: "FR",
  nl: "NL",
  en: "EN",
};

type LanguageSwitcherProps = {
  currentLocale: string;
  availableLocales: string[];
  variant?: "default" | "light";
};

export function LanguageSwitcher({ currentLocale, availableLocales, variant = "default" }: LanguageSwitcherProps) {
  const pathname = usePathname();

  // Filter locales to only show available ones
  const filteredLocales = availableLocales.filter((loc) => 
    ["fr", "nl", "en"].includes(loc)
  ) as Locale[];

  const activeLocale = filteredLocales.includes(currentLocale as Locale)
    ? (currentLocale as Locale)
    : filteredLocales[0] || routing.defaultLocale;

  // Don't show switcher if only one locale is available
  if (filteredLocales.length <= 1) {
    return null;
  }

  const isLight = variant === "light";

  return (
    <div className={cn(
      "flex items-center gap-1 rounded-full p-1 shadow-sm transition-all",
      isLight
        ? "border border-neutral-200 bg-white"
        : "border border-white/30 bg-white/10 backdrop-blur-sm"
    )}>
      {filteredLocales.map((locale) => (
        <LocaleButton
          key={locale}
          locale={locale}
          isActive={locale === activeLocale}
          pathname={pathname}
          variant={variant}
        />
      ))}
    </div>
  );
}

function LocaleButton({
  locale,
  isActive,
  pathname,
  variant = "default",
}: {
  locale: Locale;
  isActive: boolean;
  pathname: string | null;
  variant?: "default" | "light";
}) {
  const href = transformPathLocale(pathname ?? "/", locale);
  const isLight = variant === "light";

  return (
    <Button
      variant={isActive ? (isLight ? "default" : "default") : "ghost"}
      size="sm"
      className={cn(
        "h-8 rounded-full px-3 text-xs font-semibold transition-all duration-200",
        isLight
          ? isActive
            ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
            : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
          : isActive
            ? "bg-white text-primary shadow-md hover:bg-white/90"
            : "text-white/80 hover:text-white hover:bg-white/10",
      )}
      asChild
    >
      <Link href={href}>{localeLabels[locale]}</Link>
    </Button>
  );
}

function transformPathLocale(path: string, locale: Locale) {
  const segments = path.split("/");

  // Check if first segment is a valid locale (fr, nl, or en)
  if (segments.length > 1 && ["fr", "nl", "en"].includes(segments[1])) {
    segments[1] = locale;
    return segments.join("/") || "/";
  }

  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (routing.localePrefix === "always") {
    return `/${locale}${normalized}`;
  }

  return normalized;
}

