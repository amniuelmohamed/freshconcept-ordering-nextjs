import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { getAllSettings } from "@/lib/data/settings";
import { requirePagePermission } from "@/lib/auth/page-permissions";
import type { LocalePageProps } from "@/types/next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SettingsForm } from "@/components/employee/settings-form";
import { EmployeeFormSkeleton } from "@/components/ui/skeleton-cards";
import type { Locale } from "@/i18n/routing";

async function SettingsContent({ locale }: { locale: Locale }) {
  const t = await getTranslations({
    locale,
    namespace: "employeeSettings",
  });

  const settings = await getAllSettings();

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("form.title")}</CardTitle>
          <CardDescription>{t("form.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm
            locale={locale}
            initialData={{
              cutoffTime: settings.cutoffTime,
              cutoffDayOffset: settings.cutoffDayOffset,
              defaultLocale: settings.defaultLocale,
              vatRate: settings.vatRate,
              availableLocales: settings.availableLocales,
              availablePermissions: settings.availablePermissions,
              availableUnits: settings.availableUnits,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default async function SettingsPage({
  params,
}: LocalePageProps) {
  const { locale } = await params;
  await requirePagePermission(locale, ["manage_settings"]);

  return (
    <Suspense fallback={<EmployeeFormSkeleton />}>
      <SettingsContent locale={locale} />
    </Suspense>
  );
}

