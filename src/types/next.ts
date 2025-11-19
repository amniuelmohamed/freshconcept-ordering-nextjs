import type { Locale } from "@/i18n/routing";

export type LocalePageParams<
  Params extends Record<string, string> = Record<string, never>,
> = Promise<{ locale: Locale } & Params>;

export type LocalePageProps<
  Params extends Record<string, string> = Record<string, never>,
> = {
  params: LocalePageParams<Params>;
};

