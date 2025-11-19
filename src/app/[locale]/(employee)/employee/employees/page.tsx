import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { getEmployees } from "@/lib/data/employees";
import { getEmployeeRoles } from "@/lib/data/employee-roles";
import { requirePagePermission } from "@/lib/auth/page-permissions";
import type { LocalePageProps } from "@/types/next";
import type { Locale } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmployeesFilters } from "@/components/employee/employees-filters";
import { EmployeeTableSkeleton } from "@/components/ui/skeleton-cards";

type TranslatedName = {
  fr?: string;
  nl?: string;
  en?: string;
};

function getRoleName(name: TranslatedName | null, locale: Locale): string {
  if (!name || typeof name !== "object") return "-";
  return (name[locale as keyof TranslatedName] as string) ?? name.fr ?? name.nl ?? name.en ?? "-";
}

function formatDate(dateString: string | null, locale: Locale): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
  }).format(date);
}

type EmployeesPageProps = LocalePageProps & {
  searchParams: Promise<{ search?: string; role?: string }>;
};

async function EmployeesContent({
  locale,
  search,
  role,
}: {
  locale: Locale;
  search?: string;
  role?: string;
}) {
  await requirePagePermission(locale, ["manage_employees"]);
  const t = await getTranslations({
    locale,
    namespace: "employeeEmployees",
  });

  const [allEmployees, roles] = await Promise.all([
    getEmployees(),
    getEmployeeRoles(),
  ]);

  // Filter employees based on search query
  const filteredBySearch = search
    ? allEmployees.filter((employee) => {
        const searchLower = search.toLowerCase();
        const fullName = (employee.full_name ?? "").toLowerCase();
        const email = (employee.email ?? "").toLowerCase();
        const roleName = employee.employee_roles
          ? getRoleName(employee.employee_roles.name as TranslatedName, locale).toLowerCase()
          : "";
        return (
          fullName.includes(searchLower) ||
          email.includes(searchLower) ||
          roleName.includes(searchLower)
        );
      })
    : allEmployees;

  const employees = role
    ? filteredBySearch.filter((employee) => employee.employee_role_id === role)
    : filteredBySearch;

  const roleOptions = roles.map((r) => ({
    id: r.id,
    label: getRoleName(r.name as TranslatedName | null, locale),
  }));

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button asChild>
          <Link href={`/${locale}/employee/employees/new`}>
            {t("createNew")}
          </Link>
        </Button>
      </div>

      <EmployeesFilters roles={roleOptions} />

      {employees.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {t("noEmployees")}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-t-4 border-t-primary hover:shadow-lg transition-all duration-300">
          <CardContent className="p-0">
            <div className="rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("table.name")}</TableHead>
                    <TableHead>{t("table.role")}</TableHead>
                    <TableHead>{t("table.email")}</TableHead>
                    <TableHead>{t("table.created")}</TableHead>
                    <TableHead className="text-right">{t("table.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow
                      key={employee.id}
                      className="group hover:bg-muted/30 transition-colors duration-200"
                    >
                      <TableCell className="font-medium group-hover:text-primary transition-colors">
                        {employee.full_name ?? "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {employee.employee_roles
                          ? getRoleName(employee.employee_roles.name as TranslatedName, locale)
                          : "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {employee.email ?? "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(employee.created_at, locale)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm" className="hover:bg-primary hover:text-primary-foreground transition-colors">
                          <Link href={`/${locale}/employee/employees/${employee.id}`}>
                            {t("table.view")}
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default async function EmployeesPage({
  params,
  searchParams,
}: EmployeesPageProps) {
  const { locale } = await params;
  const { search, role } = await searchParams;

  return (
    <Suspense fallback={<EmployeeTableSkeleton />}>
      <EmployeesContent locale={locale} search={search} role={role} />
    </Suspense>
  );
}
