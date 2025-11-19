import { Suspense } from "react";

import { getQuickOrderData } from "@/lib/data/quick-order";
import { getClientPendingOrder } from "@/lib/data/orders";
import { getSession } from "@/lib/auth/session";
import type { LocalePageProps } from "@/types/next";
import { ProductGrid } from "@/components/client/product-grid";
import { QuickOrderPendingLoader } from "@/components/client/quick-order-pending-loader";
import { CartOrderStatusChecker } from "@/components/client/cart-order-status-checker";
import { getTranslations } from "next-intl/server";
import { QuickOrderSkeleton } from "@/components/ui/skeleton-cards";

export default async function QuickOrderPage({
  params,
}: LocalePageProps) {
  const { locale } = await params;
  const session = await getSession();
  const data = await getQuickOrderData(locale);
  const t = await getTranslations({ locale, namespace: "quickOrder" });

  // Check if client has a pending order
  const pendingOrder = session?.clientProfile?.id
    ? await getClientPendingOrder(session.clientProfile.id)
    : null;

  // Prepare pending order items for the loader
  const pendingOrderItems =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pendingOrder?.order_items?.map((item: any) => ({
      productId: item.product_id ?? item.id,
      name: item.product_name ?? "",
      quantity: item.quantity ?? 0,
      unitPrice: item.unit_price ?? 0,
      sku: item.products?.sku ?? "",
      unit: item.products?.unit ?? "",
      approximateWeight: item.products?.approximate_weight ?? null,
      subtotal: item.subtotal ?? 0,
    })) ?? [];

  return (
    <div className="flex flex-1 flex-col gap-6">
      <CartOrderStatusChecker currentPendingOrderId={pendingOrder?.id ?? null} />
      <QuickOrderPendingLoader
        pendingOrderId={pendingOrder?.id ?? null}
        pendingOrderItems={pendingOrderItems}
      />
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-foreground">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </header>
      <Suspense fallback={<QuickOrderSkeleton />}>
        <ProductGrid
          products={data.products}
          categories={data.categories}
          locale={locale}
        />
      </Suspense>
    </div>
  );
}

