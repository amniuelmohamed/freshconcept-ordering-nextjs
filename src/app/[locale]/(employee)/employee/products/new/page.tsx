import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { getCategoriesList } from "@/lib/data/categories";
import { getClientRoles } from "@/lib/data/client-roles";
import { getAvailableUnitsArray } from "@/lib/data/settings";
import { requirePagePermission } from "@/lib/auth/page-permissions";
import type { LocalePageProps } from "@/types/next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProductForm } from "@/components/employee/product-form";
import { EmployeeFormSkeleton } from "@/components/ui/skeleton-cards";
import type { Locale } from "@/i18n/routing";

type TranslatedName = {
  fr?: string;
  nl?: string;
  en?: string;
};

async function CreateProductContent({ locale }: { locale: Locale }) {
  const t = await getTranslations({
    locale,
    namespace: "employeeProducts",
  });

  const [categoriesData, clientRolesData, availableUnits] = await Promise.all([
    getCategoriesList(),
    getClientRoles(),
    getAvailableUnitsArray(),
  ]);

  // Transform categories to match ProductForm expected type
  const categories = categoriesData.map((category) => ({
    id: category.id,
    name: category.name as TranslatedName | null,
  }));

  // Transform client roles to match ProductForm expected type
  const clientRoles = clientRolesData.map((role) => ({
    id: role.id,
    name: role.name as TranslatedName | null,
    slug: role.slug,
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
          <ProductForm locale={locale} categories={categories} clientRoles={clientRoles} availableUnits={availableUnits} />
        </CardContent>
      </Card>
    </div>
  );
}

export default async function CreateProductPage({
  params,
}: LocalePageProps) {
  const { locale } = await params;
  await requirePagePermission(locale, ["manage_products"]);

  return (
    <Suspense fallback={<EmployeeFormSkeleton />}>
      <CreateProductContent locale={locale} />
    </Suspense>
  );
}
