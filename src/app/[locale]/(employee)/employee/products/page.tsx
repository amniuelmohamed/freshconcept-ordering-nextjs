import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import Image from "next/image";

import { getProducts } from "@/lib/data/products";
import { getCategoriesList } from "@/lib/data/categories";
import { requirePagePermission, hasPagePermission } from "@/lib/auth/page-permissions";
import type { LocalePageProps } from "@/types/next";
import type { Locale } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getLocalizedField } from "@/lib/utils/i18n";
import { getProductImageUrl } from "@/lib/utils/storage";
import { ProductsFilters } from "@/components/employee/products-filters";
import { EmployeeTableSkeleton } from "@/components/ui/skeleton-cards";

type TranslatedName = {
  fr?: string;
  nl?: string;
  en?: string;
};

type ProductsPageProps = LocalePageProps & {
  searchParams: Promise<{ search?: string; category?: string; sort?: string; status?: string }>;
};

async function ProductsContent({
  locale,
  search,
  category,
  sort,
  status,
}: {
  locale: Locale;
  search?: string;
  category?: string;
  sort?: string;
  status?: string;
}) {
  await requirePagePermission(locale, ["view_products", "manage_products"]);
  const t = await getTranslations({
    locale,
    namespace: "employeeProducts",
  });

  const [allProducts, canManageProducts, categories] = await Promise.all([
    getProducts(),
    hasPagePermission("manage_products"),
    getCategoriesList(),
  ]);

  // Generate signed URLs for product images (for private buckets)
  const productsWithImageUrls = await Promise.all(
    allProducts.map(async (product) => {
      const imageUrl = product.image_url
        ? await getProductImageUrl(product.image_url)
        : null;
      return { ...product, image_url: imageUrl };
    })
  );

  // Filter products based on search query
  const filteredBySearch = search
    ? productsWithImageUrls.filter((product) => {
        const searchLower = search.toLowerCase();
        const name = getLocalizedField(product.name as TranslatedName, locale).toLowerCase();
        const sku = (product.sku ?? "").toLowerCase();
        const categoryName = product.category
          ? getLocalizedField(product.category.name as TranslatedName, locale).toLowerCase()
          : "";
        return (
          name.includes(searchLower) ||
          sku.includes(searchLower) ||
          categoryName.includes(searchLower)
        );
      })
    : productsWithImageUrls;

  // Filter by category (if selected)
  const filteredByCategory = category
    ? filteredBySearch.filter((product) => product.category_id === category)
    : filteredBySearch;

  // Filter by status (active / inactive)
  const filteredByStatus =
    status === "active"
      ? filteredByCategory.filter((product) => product.active)
      : status === "inactive"
      ? filteredByCategory.filter((product) => !product.active)
      : filteredByCategory;

  // Sort products
  const sortKey = sort ?? "created-desc";
  const products = [...filteredByStatus].sort((a, b) => {
    switch (sortKey) {
      case "name-asc": {
        const nameA = getLocalizedField(a.name as TranslatedName, locale).toLowerCase();
        const nameB = getLocalizedField(b.name as TranslatedName, locale).toLowerCase();
        return nameA.localeCompare(nameB);
      }
      case "name-desc": {
        const nameA = getLocalizedField(a.name as TranslatedName, locale).toLowerCase();
        const nameB = getLocalizedField(b.name as TranslatedName, locale).toLowerCase();
        return nameB.localeCompare(nameA);
      }
      case "price-asc": {
        const priceA = Number(a.base_price ?? 0);
        const priceB = Number(b.base_price ?? 0);
        return priceA - priceB;
      }
      case "price-desc": {
        const priceA = Number(a.base_price ?? 0);
        const priceB = Number(b.base_price ?? 0);
        return priceB - priceA;
      }
      case "created-desc":
      default: {
        const dateA = new Date(a.created_at ?? 0).getTime();
        const dateB = new Date(b.created_at ?? 0).getTime();
        return dateB - dateA;
      }
    }
  });

  const categoryOptions = categories.map((cat) => ({
    id: cat.id,
    label: getLocalizedField(cat.name as TranslatedName, locale),
  }));

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        {canManageProducts && (
          <Button asChild>
            <Link href={`/${locale}/employee/products/new`}>
              {t("createNew")}
            </Link>
          </Button>
        )}
      </div>

      <ProductsFilters categories={categoryOptions} />

      {products.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {t("noProducts")}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-t-4 border-t-primary hover:shadow-lg transition-all duration-300">
          <CardContent className="p-0">
            <div className="rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">{t("table.image")}</TableHead>
                    <TableHead>{t("table.sku")}</TableHead>
                    <TableHead>{t("table.name")}</TableHead>
                    <TableHead>{t("table.category")}</TableHead>
                    <TableHead>{t("table.price")} / kg</TableHead>
                    <TableHead>{t("table.unit")}</TableHead>
                    <TableHead>{t("table.status")}</TableHead>
                    <TableHead className="text-right">{t("table.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow
                      key={product.id}
                      className="group hover:bg-muted/30 transition-colors duration-200"
                    >
                      <TableCell>
                        {product.image_url ? (
                          <div className="relative h-12 w-12 rounded-md border border-input overflow-hidden">
                            <Image
                              src={product.image_url}
                              alt={getLocalizedField(product.name as TranslatedName, locale)}
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          </div>
                        ) : (
                          <div className="h-12 w-12 rounded-md border border-input bg-muted flex items-center justify-center">
                            <span className="text-xs text-muted-foreground">-</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {product.sku ?? "-"}
                      </TableCell>
                      <TableCell className="font-medium group-hover:text-primary transition-colors">
                        {getLocalizedField(product.name as TranslatedName, locale)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {product.category
                          ? getLocalizedField(product.category.name as TranslatedName, locale)
                          : "-"}
                      </TableCell>
                      <TableCell className="font-medium">
                        {typeof product.base_price === "number"
                          ? `€${product.base_price.toFixed(2)} / kg`
                          : `€${Number(product.base_price ?? 0).toFixed(2)} / kg`}
                      </TableCell>
                      <TableCell className="text-muted-foreground uppercase text-xs">
                        {product.unit ?? "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={product.active ? "default" : "secondary"} className={product.active ? "bg-green-500 hover:bg-green-600" : ""}>
                          {product.active ? t("table.active") : t("table.inactive")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm" className="hover:bg-primary hover:text-primary-foreground transition-colors">
                          <Link href={`/${locale}/employee/products/${product.id}`}>
                            {canManageProducts ? t("table.edit") : t("table.view")}
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

export default async function EmployeeProductsPage({
  params,
  searchParams,
}: ProductsPageProps) {
  const { locale } = await params;
  const { search, category, sort, status } = await searchParams;

  return (
    <Suspense fallback={<EmployeeTableSkeleton />}>
      <ProductsContent
        locale={locale}
        search={search}
        category={category}
        sort={sort}
        status={status}
      />
    </Suspense>
  );
}
