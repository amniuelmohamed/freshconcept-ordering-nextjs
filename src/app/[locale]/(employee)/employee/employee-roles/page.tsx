import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { getEmployeeRoles } from "@/lib/data/employee-roles";
import { getAvailablePermissionsArray } from "@/lib/data/settings";
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

function formatPermissions(permissions: Record<string, unknown> | null): string[] {
  if (!permissions || typeof permissions !== "object") return [];
  return Object.keys(permissions).filter((key) => permissions[key] === true);
}

async function EmployeeRolesContent({ locale }: { locale: Locale }) {
  await requirePagePermission(locale, ["manage_employee_roles"]);
  const t = await getTranslations({
    locale,
    namespace: "employeeRoles",
  });

  const [roles, availablePermissions] = await Promise.all([
    getEmployeeRoles(),
    getAvailablePermissionsArray(),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button asChild>
          <Link href={`/${locale}/employee/employee-roles/new`}>
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
        <div className="flex flex-col gap-4">
          {/* Legend / permissions matrix header */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">{t("permissions")}</CardTitle>
              <CardDescription>
                {t("legend")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {availablePermissions.map((perm) => (
                  <span
                    key={perm}
                    className="inline-flex items-center rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-muted-foreground"
                  >
                    {t(`form.permissions.${perm}`)}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Role cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {roles.map((role) => {
              const permissions = formatPermissions(
                role.permissions as Record<string, unknown> | null,
              );
              return (
                <Card key={role.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle>{getRoleName(role.name as TranslatedName, locale)}</CardTitle>
                    <CardDescription>
                      {t("employees")}: {role.employeeCount}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-4">
                    {permissions.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          {t("permissions")}:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {permissions.map((perm) => (
                            <span
                              key={perm}
                              className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground"
                            >
                              {t(`form.permissions.${perm}`) || perm}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <Button asChild variant="outline" className="w-full">
                      <Link href={`/${locale}/employee/employee-roles/${role.id}`}>
                        {t("viewDetails")}
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default async function EmployeeRolesPage({
  params,
}: LocalePageProps) {
  const { locale } = await params;

  return (
    <Suspense fallback={<EmployeeGridSkeleton />}>
      <EmployeeRolesContent locale={locale} />
    </Suspense>
  );
}

