import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import type { LocalePageProps } from "@/types/next";
import type { Locale } from "@/i18n/routing";
import { getOrderById } from "@/lib/data/orders";
import { getSession } from "@/lib/auth/session";
import { formatPrice } from "@/lib/utils/pricing";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClientOrderModifyButton } from "@/components/client/order-modify-button";
import { ClientOrderCancelButton } from "@/components/client/order-cancel-button";
import { OrderStatusBadge } from "@/components/client/order-status-badge";
import { OrderDetailSkeleton } from "@/components/ui/skeleton-cards";

async function OrderDetailContent({ locale, id }: { locale: Locale; id: string }) {
  const t = await getTranslations({ locale, namespace: "clientOrders" });

  const session = await getSession();
  const orderData = await getOrderById(id);

  if (!orderData) {
    notFound();
  }

  // Ensure the order belongs to the current client
  if (!session?.clientProfile || orderData.client_id !== session.clientProfile.id) {
    notFound();
  }

  const order = orderData as typeof orderData & {
    items: Array<{
      id: string;
      product_id: string | null;
      product_name: string | null;
      quantity: number | null;
      unit_price: number | null;
      subtotal: number | null;
      products: {
        id: string;
        sku: string | null;
        unit: string | null;
        approximate_weight: number | null;
      } | null;
    }>;
  };

  const canModify = order.status === "pending";

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {t("detail.title", { orderId: id.slice(0, 8) })}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("detail.subtitle")}
          </p>
        </div>
        <div className="flex gap-2">
          {canModify && (
            <>
              <ClientOrderModifyButton
                locale={locale}
                orderId={order.id}
                items={order.items.map((item) => ({
                  // Use the original product ID so cart and quick-order quantities stay in sync
                  productId: item.product_id ?? item.id,
                  name: item.product_name ?? "",
                  quantity: item.quantity ?? 0,
                  unitPrice: item.unit_price ?? 0,
                  sku: item.products?.sku ?? "",
                  unit: item.products?.unit ?? "",
                  approximateWeight: item.products?.approximate_weight ?? null,
                  subtotal: item.subtotal ?? 0,
                }))}
              />
              <ClientOrderCancelButton locale={locale} orderId={order.id} />
            </>
          )}
          <Button asChild variant="outline">
            <a href={`/${locale}/orders`}>{t("detail.backToList")}</a>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("detail.info.title")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm md:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              {t("detail.info.status")}
            </p>
            <div className="mt-1">
              <OrderStatusBadge status={order.status || "pending"} />
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              {t("detail.info.created")}
            </p>
            <p className="text-foreground">
              {order.created_at
                ? new Intl.DateTimeFormat(locale, { dateStyle: "full" }).format(
                    new Date(order.created_at),
                  )
                : "-"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              {t("detail.info.deliveryDate")}
            </p>
            <p className="text-foreground">
              {order.delivery_date
                ? new Intl.DateTimeFormat(locale, { dateStyle: "full" }).format(
                    new Date(order.delivery_date),
                  )
                : "-"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              {t("detail.info.estimatedTotal")}
            </p>
            <p className="text-lg font-semibold text-foreground">
              {order.estimated_total
                ? formatPrice(order.estimated_total, locale, "EUR")
                : "-"}
            </p>
          </div>
          {order.final_total ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                {t("detail.info.finalTotal")}
              </p>
              <p className="text-lg font-semibold text-foreground">
                {formatPrice(order.final_total, locale, "EUR")}
              </p>
            </div>
          ) : null}
          {order.notes ? (
            <div className="md:col-span-2">
              <p className="text-xs font-medium text-muted-foreground">
                {t("detail.info.notes")}
              </p>
              <p className="text-sm text-foreground whitespace-pre-line">
                {order.notes}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("detail.items.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="hidden grid-cols-[2fr_1fr_1fr_1fr] gap-4 text-xs font-medium text-muted-foreground md:grid">
            <span>{t("detail.items.table.product")}</span>
            <span className="text-center">{t("detail.items.table.quantity")}</span>
            <span className="text-center">{t("detail.items.table.unitPrice")}</span>
            <span className="text-right">{t("detail.items.table.subtotal")}</span>
          </div>
          <div className="space-y-3">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="grid gap-3 rounded-lg border border-border p-4 md:grid-cols-[2fr_1fr_1fr_1fr] md:items-center md:gap-4"
              >
                <div>
                  <p className="font-semibold text-foreground">
                    {item.product_name ?? "-"}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground md:text-center">
                  {item.quantity ?? 0}
                </p>
                <p className="text-sm text-muted-foreground md:text-center">
                  {item.unit_price
                    ? formatPrice(item.unit_price, locale, "EUR")
                    : "-"}
                </p>
                <p className="text-sm font-semibold text-foreground md:text-right">
                  {item.subtotal
                    ? formatPrice(item.subtotal, locale, "EUR")
                    : "-"}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function ClientOrderDetailPage({
  params,
}: LocalePageProps<{ id: string }>) {
  const { locale, id } = await params;

  return (
    <Suspense fallback={<OrderDetailSkeleton />}>
      <OrderDetailContent locale={locale} id={id} />
    </Suspense>
  );
}

