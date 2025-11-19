import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";

import { getProductById } from "@/lib/data/products";
import { getCategoriesList } from "@/lib/data/categories";
import { getClientRoles } from "@/lib/data/client-roles";
import { getAvailableUnitsArray } from "@/lib/data/settings";
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
import { ProductForm } from "@/components/employee/product-form";
import { DeleteProductButton } from "@/components/employee/delete-product-button";
import { getLocalizedField } from "@/lib/utils/i18n";
import { getProductImageUrl } from "@/lib/utils/storage";
import { EmployeeFormSkeleton } from "@/components/ui/skeleton-cards";
import { createClient } from "@/lib/supabase/server";

type ProductDetailPageProps = LocalePageProps<{ id: string }>;

type TranslatedName = {
  fr?: string;
  nl?: string;
  en?: string;
};

async function ProductDetailContent({
  locale,
  id,
}: {
  locale: Locale;
  id: string;
}) {
  const t = await getTranslations({
    locale,
    namespace: "employeeProducts",
  });

  const supabase = await createClient();
  
  const [product, categoriesData, clientRolesData, availableUnits, canManageProducts, orderItemCountResult] = await Promise.all([
    getProductById(id),
    getCategoriesList(),
    getClientRoles(),
    getAvailableUnitsArray(),
    hasPagePermission("manage_products"),
    supabase
      .from("order_items")
      .select("id", { count: "exact", head: true })
      .eq("product_id", id),
  ]);

  if (!product) {
    notFound();
  }

  const orderItemCount = orderItemCountResult.count ?? 0;

  // Generate signed URL for product image (for private buckets)
  const productImageUrl = product.image_url
    ? await getProductImageUrl(product.image_url)
    : null;

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {getLocalizedField(product.name as TranslatedName, locale)}
          </h1>
          {product.sku && (
            <p className="text-sm text-muted-foreground font-mono">{product.sku}</p>
          )}
        </div>
        <Button asChild variant="outline">
          <Link href={`/${locale}/employee/products`}>
            {t("backToList")}
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {canManageProducts ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("edit.title")}</CardTitle>
              <CardDescription>{t("edit.subtitle")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ProductForm
              locale={locale}
              categories={categories}
              clientRoles={clientRoles}
              availableUnits={availableUnits}
              product={{
                id: product.id,
                sku: product.sku,
                name: product.name as TranslatedName | null,
                description: product.description as TranslatedName | null,
                category_id: product.category_id,
                base_price: typeof product.base_price === "number"
                  ? product.base_price
                  : Number(product.base_price ?? 0),
                unit: product.unit,
                approximate_weight: typeof product.approximate_weight === "number"
                  ? product.approximate_weight
                  : product.approximate_weight === null
                  ? null
                  : Number(product.approximate_weight ?? 0),
                image_url: product.image_url,
                visible_to: Array.isArray(product.visible_to) 
                  ? (product.visible_to as string[])
                  : null,
                active: product.active,
              }}
              />
            </CardContent>
          </Card>
        ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t("detail.title")}</CardTitle>
            <CardDescription>{t("detail.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-sm">
            {productImageUrl && (
              <div className="relative w-full h-64 rounded-md border border-input overflow-hidden">
                <Image
                  src={productImageUrl}
                  alt={getLocalizedField(product.name as TranslatedName, locale)}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </div>
            )}
            <div className="space-y-4">
              {product.sku && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("form.sku.label")}
                  </p>
                  <p className="text-foreground font-mono">{product.sku}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  {t("detail.name")}
                </p>
                <p className="text-foreground">{getLocalizedField(product.name as TranslatedName, locale)}</p>
              </div>
              {product.description && typeof product.description === "object" && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("detail.description")}
                  </p>
                  <p className="text-foreground">
                    {getLocalizedField(product.description as TranslatedName, locale)}
                  </p>
                </div>
              )}
              {product.category && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("form.category.label")}
                  </p>
                  <p className="text-foreground">
                    {getLocalizedField(product.category.name as TranslatedName, locale)}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  {t("form.basePrice.label")}
                </p>
                <p className="text-foreground">
                  {typeof product.base_price === "number"
                    ? `€${product.base_price.toFixed(2)} / kg`
                    : `€${Number(product.base_price ?? 0).toFixed(2)} / kg`}
                </p>
              </div>
              {product.unit && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("form.unit.label")}
                  </p>
                  <p className="text-foreground">{product.unit}</p>
                </div>
              )}
              {product.approximate_weight && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("form.approximateWeight.label")}
                  </p>
                  <p className="text-foreground">
                    {typeof product.approximate_weight === "number"
                      ? `${product.approximate_weight} kg`
                      : `${Number(product.approximate_weight)} kg`}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  {t("form.active.label")}
                </p>
                <p className="text-foreground">
                  {product.active ? t("table.active") : t("table.inactive")}
                </p>
              </div>
              {product.visible_to && Array.isArray(product.visible_to) && product.visible_to.length > 0 ? (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("form.visibleTo.label")}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {product.visible_to.map((roleSlug) => {
                      // visible_to stores role slugs
                      const role = clientRolesData.find((r) => r.slug === roleSlug);
                      if (!role) return null;
                      return (
                        <Badge key={role.id} variant="default" className="bg-blue-500 hover:bg-blue-600">
                          {getLocalizedField(role.name as TranslatedName, locale)}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("form.visibleTo.label")}
                  </p>
                  <p className="text-foreground text-muted-foreground italic">
                    {t("form.visibleTo.allClients")}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        )}

        {canManageProducts && (
          <Card>
            <CardHeader>
              <CardTitle>{t("delete.title")}</CardTitle>
              <CardDescription>{t("delete.subtitle")}</CardDescription>
            </CardHeader>
            <CardContent>
              <DeleteProductButton
                locale={locale}
                productId={product.id}
                productName={getLocalizedField(product.name as TranslatedName, locale)}
                orderItemCount={orderItemCount}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { locale, id } = await params;
  await requirePagePermission(locale, ["view_products", "manage_products"]);

  return (
    <Suspense fallback={<EmployeeFormSkeleton />}>
      <ProductDetailContent locale={locale} id={id} />
    </Suspense>
  );
}
