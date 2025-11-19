import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { getClientRoles } from "@/lib/data/client-roles";
import { requirePagePermission } from "@/lib/auth/page-permissions";
import type { LocalePageProps } from "@/types/next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ClientForm } from "@/components/employee/client-form";
import { EmployeeFormSkeleton } from "@/components/ui/skeleton-cards";
import type { Locale } from "@/i18n/routing";

async function CreateClientContent({ locale }: { locale: Locale }) {
  const t = await getTranslations({
    locale,
    namespace: "employeeClients",
  });

  const rolesData = await getClientRoles();

  // Transform roles to match ClientForm expected type
  const roles = rolesData.map((role) => ({
    id: role.id,
    name: role.name as { fr?: string; nl?: string; en?: string } | null,
    slug: role.slug,
    default_delivery_days: role.default_delivery_days,
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
          <ClientForm locale={locale} roles={roles} />
        </CardContent>
      </Card>
    </div>
  );
}

export default async function EmployeeClientCreatePage({
  params,
}: LocalePageProps) {
  const { locale } = await params;
  await requirePagePermission(locale, ["manage_clients"]);

  return (
    <Suspense fallback={<EmployeeFormSkeleton />}>
      <CreateClientContent locale={locale} />
    </Suspense>
  );
}
