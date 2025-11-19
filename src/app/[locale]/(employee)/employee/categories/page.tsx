import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { getCategories } from "@/lib/data/categories";
import { requirePagePermission, hasPagePermission } from "@/lib/auth/page-permissions";
import type { LocalePageProps } from "@/types/next";
import type { Locale } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmployeeGridSkeleton } from "@/components/ui/skeleton-cards";

type TranslatedName = {
  fr?: string;
  nl?: string;
  en?: string;
};

function getCategoryName(name: TranslatedName | null, locale: Locale): string {
  if (!name || typeof name !== "object") return "-";
  return (name[locale as keyof TranslatedName] as string) ?? name.fr ?? name.nl ?? name.en ?? "-";
}

async function CategoriesContent({ locale }: { locale: Locale }) {
  await requirePagePermission(locale, ["view_products", "manage_products"]);
  const t = await getTranslations({
    locale,
    namespace: "categories",
  });

  const [categories, canManageCategories] = await Promise.all([
    getCategories(),
    hasPagePermission("manage_products"),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        {canManageCategories && (
          <Button asChild>
            <Link href={`/${locale}/employee/categories/new`}>
              {t("createNew")}
            </Link>
          </Button>
        )}
      </div>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {t("noCategories")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Card key={category.id} className="flex flex-col">
              <CardHeader>
                <CardTitle>{getCategoryName(category.name as TranslatedName, locale)}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between gap-4">
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      {t("productCount")}
                    </p>
                    <p className="text-foreground">{category.productCount}</p>
                  </div>
                  {category.description && typeof category.description === "object" && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        {t("description")}
                      </p>
                      <p className="text-foreground line-clamp-2">
                        {getCategoryName(category.description as TranslatedName, locale)}
                      </p>
                    </div>
                  )}
                </div>
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/${locale}/employee/categories/${category.id}`}>
                    {t("viewDetails")}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default async function CategoriesPage({
  params,
}: LocalePageProps) {
  const { locale } = await params;

  return (
    <Suspense fallback={<EmployeeGridSkeleton />}>
      <CategoriesContent locale={locale} />
    </Suspense>
  );
}
