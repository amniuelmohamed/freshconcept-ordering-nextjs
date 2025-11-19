import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Suspense } from "react";

import { getEmployeeRoleById, getEmployeeRoles } from "@/lib/data/employee-roles";
import { getAvailablePermissionsArray } from "@/lib/data/settings";
import { requirePagePermission } from "@/lib/auth/page-permissions";
import type { LocalePageProps } from "@/types/next";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmployeeRoleForm } from "@/components/employee/employee-role-form";
import { DeleteEmployeeRoleButton } from "@/components/employee/delete-employee-role-button";
import { EmployeeFormSkeleton } from "@/components/ui/skeleton-cards";
import type { Locale } from "@/i18n/routing";

type EmployeeRoleDetailPageProps = LocalePageProps<{ id: string }>;

type TranslatedName = {
  fr?: string;
  nl?: string;
  en?: string;
};

function getRoleName(name: TranslatedName | null, locale: string): string {
  if (!name || typeof name !== "object") return "-";
  return (name[locale as keyof TranslatedName] as string) ?? name.fr ?? name.nl ?? name.en ?? "-";
}

async function EmployeeRoleDetailContent({
  locale,
  id,
}: {
  locale: Locale;
  id: string;
}) {
  const t = await getTranslations({
    locale,
    namespace: "employeeRoles",
  });

  const [role, allRoles, availablePermissions] = await Promise.all([
    getEmployeeRoleById(id),
    getEmployeeRoles(),
    getAvailablePermissionsArray(),
  ]);

  if (!role) {
    notFound();
  }

  // Find employee count for this role
  const roleWithCount = allRoles.find((r) => r.id === role.id);
  const employeeCount = roleWithCount?.employeeCount ?? 0;

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {getRoleName(role.name as TranslatedName, locale)}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("employees")}: {employeeCount}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/${locale}/employee/employee-roles`}>
            {t("backToList")}
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("edit.title")}</CardTitle>
          <CardDescription>{t("edit.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <EmployeeRoleForm
            locale={locale}
            availablePermissions={availablePermissions}
            role={{
              id: role.id,
              name: role.name as TranslatedName | null,
              permissions: role.permissions as Record<string, boolean> | null,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">{t("delete.title")}</CardTitle>
          <CardDescription>{t("delete.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteEmployeeRoleButton
            locale={locale}
            roleId={role.id}
            roleName={getRoleName(role.name as TranslatedName, locale)}
            employeeCount={employeeCount}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default async function EmployeeRoleDetailPage({
  params,
}: EmployeeRoleDetailPageProps) {
  const { locale, id } = await params;
  await requirePagePermission(locale, ["manage_employee_roles"]);

  return (
    <Suspense fallback={<EmployeeFormSkeleton />}>
      <EmployeeRoleDetailContent locale={locale} id={id} />
    </Suspense>
  );
}

