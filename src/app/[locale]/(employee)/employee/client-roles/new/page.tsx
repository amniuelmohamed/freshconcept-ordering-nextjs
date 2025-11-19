import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { requirePagePermission } from "@/lib/auth/page-permissions";
import type { LocalePageProps } from "@/types/next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ClientRoleForm } from "@/components/employee/client-role-form";
import { EmployeeFormSkeleton } from "@/components/ui/skeleton-cards";
import type { Locale } from "@/i18n/routing";

async function CreateClientRoleContent({ locale }: { locale: Locale }) {
  const t = await getTranslations({
    locale,
    namespace: "clientRoles",
  });

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
          <ClientRoleForm locale={locale} />
        </CardContent>
      </Card>
    </div>
  );
}

export default async function CreateClientRolePage({
  params,
}: LocalePageProps) {
  const { locale } = await params;
  await requirePagePermission(locale, ["manage_client_roles"]);

  return (
    <Suspense fallback={<EmployeeFormSkeleton />}>
      <CreateClientRoleContent locale={locale} />
    </Suspense>
  );
}

