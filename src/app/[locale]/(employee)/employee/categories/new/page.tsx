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
import { CategoryForm } from "@/components/employee/category-form";
import { EmployeeFormSkeleton } from "@/components/ui/skeleton-cards";
import type { Locale } from "@/i18n/routing";

async function CreateCategoryContent({ locale }: { locale: Locale }) {
  const t = await getTranslations({
    locale,
    namespace: "categories",
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
          <CategoryForm locale={locale} />
        </CardContent>
      </Card>
    </div>
  );
}

export default async function CreateCategoryPage({
  params,
}: LocalePageProps) {
  const { locale } = await params;
  await requirePagePermission(locale, ["manage_products"]);

  return (
    <Suspense fallback={<EmployeeFormSkeleton />}>
      <CreateCategoryContent locale={locale} />
    </Suspense>
  );
}

