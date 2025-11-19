import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { getClientRoles } from "@/lib/data/client-roles";
import { requirePagePermission } from "@/lib/auth/page-permissions";
import type { LocalePageProps } from "@/types/next";
import type { Locale } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmployeeGridSkeleton } from "@/components/ui/skeleton-cards";

type TranslatedName = {
  fr?: string;
  nl?: string;
  en?: string;
};

function getRoleName(name: TranslatedName | null, locale: Locale): string {
  if (!name || typeof name !== "object") return "-";
  return (name[locale as keyof TranslatedName] as string) ?? name.fr ?? name.nl ?? name.en ?? "-";
}

function translateDeliveryDays(
  days: string[] | null,
  t: (key: string) => string,
): string {
  if (!days || days.length === 0) return "-";
  
  const dayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const dayMap: Record<string, string> = {
    monday: "form.deliveryDays.monday",
    tuesday: "form.deliveryDays.tuesday",
    wednesday: "form.deliveryDays.wednesday",
    thursday: "form.deliveryDays.thursday",
    friday: "form.deliveryDays.friday",
    saturday: "form.deliveryDays.saturday",
    sunday: "form.deliveryDays.sunday",
  };

  // Sort days by their order in the week
  const sortedDays = [...days].sort((a, b) => {
    const aIndex = dayOrder.indexOf(a.toLowerCase());
    const bIndex = dayOrder.indexOf(b.toLowerCase());
    return aIndex - bIndex;
  });

  return sortedDays
    .map((day) => {
      const normalized = day.toLowerCase();
      return dayMap[normalized] ? t(dayMap[normalized]) : day;
    })
    .join(", ");
}

async function ClientRolesContent({ locale }: { locale: Locale }) {
  await requirePagePermission(locale, ["manage_client_roles"]);
  const t = await getTranslations({
    locale,
    namespace: "clientRoles",
  });

  const roles = await getClientRoles();

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button asChild>
          <Link href={`/${locale}/employee/client-roles/new`}>
            {t("createNew")}
          </Link>
        </Button>
      </div>

      {roles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {t("noRoles")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => (
            <Card key={role.id} className="flex flex-col">
              <CardHeader>
                <CardTitle>{getRoleName(role.name as TranslatedName, locale)}</CardTitle>
                <CardDescription>
                  <span className="font-mono text-xs">{role.slug}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between gap-4">
                <div className="space-y-2 text-sm">
                  {role.default_delivery_days && role.default_delivery_days.length > 0 ? (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        {t("defaultDeliveryDays")}
                      </p>
                      <p className="text-foreground">
                        {translateDeliveryDays(role.default_delivery_days, t)}
                      </p>
                    </div>
                  ) : null}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      {t("clientCount")}
                    </p>
                    <p className="text-foreground">{role.clientCount}</p>
                  </div>
                </div>
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/${locale}/employee/client-roles/${role.id}`}>
                    {t("viewDetails")}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default async function ClientRolesPage({
  params,
}: LocalePageProps) {
  const { locale } = await params;

  return (
    <Suspense fallback={<EmployeeGridSkeleton />}>
      <ClientRolesContent locale={locale} />
    </Suspense>
  );
}

