import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { getQuickOrderData } from "@/lib/data/quick-order";
import type { LocalePageProps } from "@/types/next";
import { ProductGrid } from "@/components/client/product-grid";
import { QuickOrderSkeleton } from "@/components/ui/skeleton-cards";

export default async function FavoritesPage({
  params,
}: LocalePageProps) {
  const { locale } = await params;

  const [data, t] = await Promise.all([
    getQuickOrderData(locale),
    getTranslations({ locale, namespace: "quickOrder" }),
  ]);

  const favoriteProducts = data.products.filter((product) => product.isFavorite);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-foreground">
          {t("favorites")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </header>
      <Suspense fallback={<QuickOrderSkeleton />}>
        <ProductGrid
          products={favoriteProducts}
          categories={data.categories}
          locale={locale}
          showFavoritesToggle={false}
        />
      </Suspense>
    </div>
  );
}

