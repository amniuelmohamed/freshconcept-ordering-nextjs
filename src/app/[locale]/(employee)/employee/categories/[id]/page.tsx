import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Suspense } from "react";

import { getCategoryById, getCategories } from "@/lib/data/categories";
import { getProductsByCategory } from "@/lib/data/products";
import { requirePagePermission, hasPagePermission } from "@/lib/auth/page-permissions";
import type { LocalePageProps } from "@/types/next";
import type { Locale } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CategoryForm } from "@/components/employee/category-form";
import { DeleteCategoryButton } from "@/components/employee/delete-category-button";
import { getLocalizedField } from "@/lib/utils/i18n";
import { EmployeeFormSkeleton } from "@/components/ui/skeleton-cards";

type CategoryDetailPageProps = LocalePageProps<{ id: string }>;

type TranslatedName = {
  fr?: string;
  nl?: string;
  en?: string;
};

function getCategoryName(name: TranslatedName | null, locale: string): string {
  if (!name || typeof name !== "object") return "-";
  return (name[locale as keyof TranslatedName] as string) ?? name.fr ?? name.nl ?? name.en ?? "-";
}

function getCategoryDescription(description: TranslatedName | null, locale: string): string {
  if (!description || typeof description !== "object") return "-";
  return (description[locale as keyof TranslatedName] as string) ?? description.fr ?? description.nl ?? description.en ?? "-";
}

async function CategoryDetailContent({
  locale,
  id,
}: {
  locale: Locale;
  id: string;
}) {
  const t = await getTranslations({
    locale,
    namespace: "categories",
  });

  const [category, allCategories, products, canManageCategories] = await Promise.all([
    getCategoryById(id),
    getCategories(),
    getProductsByCategory(id),
    hasPagePermission("manage_products"),
  ]);

  if (!category) {
    notFound();
  }

  // Find product count for this category
  const categoryWithCount = allCategories.find((c) => c.id === category.id);
  const productCount = categoryWithCount?.productCount ?? 0;

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {getCategoryName(category.name as TranslatedName, locale)}
          </h1>
        </div>
        <Button asChild variant="outline">
          <Link href={`/${locale}/employee/categories`}>
            {t("backToList")}
          </Link>
        </Button>
      </div>

      {canManageCategories ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{t("edit.title")}</CardTitle>
              <CardDescription>{t("edit.subtitle")}</CardDescription>
            </CardHeader>
            <CardContent>
              <CategoryForm
                locale={locale}
                category={{
                  id: category.id,
                  name: category.name as TranslatedName | null,
                  description: category.description as TranslatedName | null,
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
              <DeleteCategoryButton
                locale={locale}
                categoryId={category.id}
                categoryName={getCategoryName(category.name as TranslatedName, locale)}
                productCount={productCount}
              />
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t("detail.title")}</CardTitle>
            <CardDescription>{t("detail.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-sm">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  {t("detail.name")}
                </p>
                <p className="text-foreground">{getCategoryName(category.name as TranslatedName, locale)}</p>
              </div>
              {category.description && typeof category.description === "object" && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("detail.description")}
                  </p>
                  <p className="text-foreground">
                    {getCategoryDescription(category.description as TranslatedName, locale)}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  {t("productCount")}
                </p>
                <p className="text-foreground">{productCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {products.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("products.title")}</CardTitle>
            <CardDescription>{t("products.subtitle", { count: products.length })}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("products.table.sku")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("products.table.name")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("products.table.price")} / kg
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("products.table.unit")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("products.table.status")}
                    </th>
                    {canManageCategories && (
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("products.table.actions")}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {products.map((product) => (
                    <tr
                      key={product.id}
                      className="transition-colors hover:bg-muted/50"
                    >
                      <td className="px-4 py-3 text-sm font-mono text-muted-foreground">
                        {product.sku ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-foreground">
                        {getLocalizedField(product.name as TranslatedName, locale)}
                      </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    {typeof product.base_price === "number"
                      ? `€${product.base_price.toFixed(2)} / kg`
                      : `€${Number(product.base_price ?? 0).toFixed(2)} / kg`}
                  </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {product.unit ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Badge variant={product.active ? "default" : "secondary"} className={product.active ? "bg-green-500 hover:bg-green-600" : ""}>
                          {product.active ? t("products.table.active") : t("products.table.inactive")}
                        </Badge>
                      </td>
                      {canManageCategories && (
                        <td className="px-4 py-3 text-right">
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/${locale}/employee/products/${product.id}`}>
                              {t("products.table.edit")}
                            </Link>
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default async function CategoryDetailPage({
  params,
}: CategoryDetailPageProps) {
  const { locale, id } = await params;
  await requirePagePermission(locale, ["view_products", "manage_products"]);

  return (
    <Suspense fallback={<EmployeeFormSkeleton />}>
      <CategoryDetailContent locale={locale} id={id} />
    </Suspense>
  );
}

