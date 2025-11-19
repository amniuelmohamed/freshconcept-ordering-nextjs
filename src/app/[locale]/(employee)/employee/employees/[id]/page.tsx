import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { getEmployeeById } from "@/lib/data/employees";
import { getEmployeeRoles } from "@/lib/data/employee-roles";
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
import { EmployeeForm } from "@/components/employee/employee-form";
import { DeleteEmployeeButton } from "@/components/employee/delete-employee-button";
import { EmployeeFormSkeleton } from "@/components/ui/skeleton-cards";
import { hasPagePermission } from "@/lib/auth/page-permissions";

type TranslatedName = {
  fr?: string;
  nl?: string;
  en?: string;
};

async function EmployeeDetailContent({
  locale,
  id,
}: {
  locale: Locale;
  id: string;
}) {
  const t = await getTranslations({
    locale,
    namespace: "employeeEmployees",
  });

  const [employee, rolesData, canManageEmployees] = await Promise.all([
    getEmployeeById(id),
    getEmployeeRoles(),
    hasPagePermission("manage_employees"),
  ]);

  // Transform roles to match EmployeeForm expected type
  const roles = rolesData.map((role) => ({
    id: role.id,
    name: role.name as TranslatedName | null,
  }));

  if (!employee) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t("edit.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("edit.subtitle")}</p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/${locale}/employee/employees`}>
            {t("backToList")}
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t("form.title")}</CardTitle>
            <CardDescription>{t("form.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <EmployeeForm
              locale={locale}
              roles={roles}
              employee={{
                id: employee.id,
                full_name: employee.full_name,
                employee_role_id: employee.employee_role_id,
                email: employee.email,
              }}
            />
          </CardContent>
        </Card>

        {canManageEmployees && (
          <Card>
            <CardHeader>
              <CardTitle>{t("delete.title")}</CardTitle>
              <CardDescription>{t("delete.subtitle")}</CardDescription>
            </CardHeader>
            <CardContent>
              <DeleteEmployeeButton
                locale={locale}
                employeeId={employee.id}
                employeeName={employee.full_name ?? employee.email ?? ""}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default async function EmployeeDetailPage({
  params,
}: LocalePageProps<{ id: string }>) {
  const { locale, id } = await params;
  await requirePagePermission(locale, ["manage_employees"]);

  return (
    <Suspense fallback={<EmployeeFormSkeleton />}>
      <EmployeeDetailContent locale={locale} id={id} />
    </Suspense>
  );
}

