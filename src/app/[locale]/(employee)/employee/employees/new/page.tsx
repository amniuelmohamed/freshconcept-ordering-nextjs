import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { getEmployeeRoles } from "@/lib/data/employee-roles";
import { requirePagePermission } from "@/lib/auth/page-permissions";
import type { LocalePageProps } from "@/types/next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmployeeForm } from "@/components/employee/employee-form";
import { EmployeeFormSkeleton } from "@/components/ui/skeleton-cards";
import type { Locale } from "@/i18n/routing";

async function CreateEmployeeContent({ locale }: { locale: Locale }) {
  const t = await getTranslations({
    locale,
    namespace: "employeeEmployees",
  });

  const rolesData = await getEmployeeRoles();

  // Transform roles to match EmployeeForm expected type
  type TranslatedName = {
    fr?: string;
    nl?: string;
    en?: string;
  };
  const roles = rolesData.map((role) => ({
    id: role.id,
    name: role.name as TranslatedName | null,
  }));

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{t("create.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("create.subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("form.title")}</CardTitle>
          <CardDescription>{t("form.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <EmployeeForm locale={locale} roles={roles} />
        </CardContent>
      </Card>
    </div>
  );
}

export default async function EmployeeCreatePage({
  params,
}: LocalePageProps) {
  const { locale } = await params;
  await requirePagePermission(locale, ["manage_employees"]);

  return (
    <Suspense fallback={<EmployeeFormSkeleton />}>
      <CreateEmployeeContent locale={locale} />
    </Suspense>
  );
}
