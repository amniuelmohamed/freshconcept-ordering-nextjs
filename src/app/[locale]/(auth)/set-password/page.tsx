import { getTranslations } from "next-intl/server";

import { SetPasswordForm } from "@/components/auth/set-password-form";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { Logo } from "@/components/shared/logo";
import { requireAnonymous } from "@/lib/auth/session";
import { getAvailableLocalesArray } from "@/lib/data/settings";
import type { LocalePageProps } from "@/types/next";

type SetPasswordPageProps = LocalePageProps<Record<string, never>>;

export default async function SetPasswordPage({
  params,
}: SetPasswordPageProps) {
  const { locale } = await params;
  await requireAnonymous(locale);
  const t = await getTranslations({ locale, namespace: "auth.setPassword" });
  const availableLocales = await getAvailableLocalesArray();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-neutral-100 px-4 py-12">
      {/* Logo */}
      <div className="mb-8">
        <Logo size="xl" />
      </div>

      {/* Set password card */}
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <div className="mb-8 space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-neutral-900">
            {t("title")}
          </h1>
          <p className="text-sm text-neutral-600">{t("subtitle")}</p>
        </div>
        <SetPasswordForm locale={locale} />
      </div>

      {/* Language switcher below form */}
      <div className="mt-6">
        <LanguageSwitcher 
          currentLocale={locale} 
          availableLocales={availableLocales}
          variant="light"
        />
      </div>
    </div>
  );
}

