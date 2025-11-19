import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { requireAnonymous } from "@/lib/auth/session";
import { getAvailableLocalesArray } from "@/lib/data/settings";
import type { LocalePageProps } from "@/types/next";
import { Button } from "@/components/ui/button";

export default async function ResetPasswordPage({ params }: LocalePageProps) {
  const { locale } = await params;

  await requireAnonymous(locale);
  const t = await getTranslations({ locale, namespace: "auth.resetPassword" });
  const availableLocales = await getAvailableLocalesArray();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-neutral-100 px-4 py-12">
      {/* Language switcher above card */}
      <div className="mb-6">
        <LanguageSwitcher 
          currentLocale={locale} 
          availableLocales={availableLocales}
          variant="light"
        />
      </div>
      
      {/* Reset password card */}
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <div className="mb-8 space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-neutral-900">
            {t("title")}
          </h1>
          <p className="text-sm text-neutral-600">{t("subtitle")}</p>
        </div>
        
        <ResetPasswordForm locale={locale} />
        
        <div className="mt-6 text-center">
          <Button asChild variant="link" className="text-sm">
            <Link href={`/${locale}/login`}>
              {t("backToLogin")}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

