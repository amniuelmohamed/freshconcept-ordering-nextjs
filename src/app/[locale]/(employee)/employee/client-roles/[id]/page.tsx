import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Suspense } from "react";

import { getClientRoleById, getClientRoles } from "@/lib/data/client-roles";
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
import { ClientRoleForm } from "@/components/employee/client-role-form";
import { DeleteRoleButton } from "@/components/employee/delete-role-button";
import { EmployeeFormSkeleton } from "@/components/ui/skeleton-cards";
import type { Locale } from "@/i18n/routing";

type ClientRoleDetailPageProps = LocalePageProps<{ id: string }>;

type TranslatedName = {
  fr?: string;
  nl?: string;
  en?: string;
};

function getRoleName(name: TranslatedName | null, locale: string): string {
  if (!name || typeof name !== "object") return "-";
  return (name[locale as keyof TranslatedName] as string) ?? name.fr ?? name.nl ?? name.en ?? "-";
}


async function ClientRoleDetailContent({
  locale,
  id,
}: {
  locale: Locale;
  id: string;
}) {
  const t = await getTranslations({
    locale,
    namespace: "clientRoles",
  });

  const [role, allRoles] = await Promise.all([
    getClientRoleById(id),
    getClientRoles(),
  ]);

  if (!role) {
    notFound();
  }

  // Find client count for this role
  const roleWithCount = allRoles.find((r) => r.id === role.id);
  const clientCount = roleWithCount?.clientCount ?? 0;

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {getRoleName(role.name as TranslatedName, locale)}
          </h1>
          <p className="text-sm text-muted-foreground">
            <span className="font-mono">{role.slug}</span>
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/${locale}/employee/client-roles`}>
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
          <ClientRoleForm
            locale={locale}
            role={{
              id: role.id,
              name: role.name as TranslatedName | null,
              slug: role.slug,
              description: role.description as TranslatedName | null,
              default_delivery_days: role.default_delivery_days,
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
          <DeleteRoleButton
            locale={locale}
            roleId={role.id}
            roleName={getRoleName(role.name as TranslatedName, locale)}
            clientCount={clientCount}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default async function ClientRoleDetailPage({
  params,
}: ClientRoleDetailPageProps) {
  const { locale, id } = await params;
  await requirePagePermission(locale, ["manage_client_roles"]);

  return (
    <Suspense fallback={<EmployeeFormSkeleton />}>
      <ClientRoleDetailContent locale={locale} id={id} />
    </Suspense>
  );
}

