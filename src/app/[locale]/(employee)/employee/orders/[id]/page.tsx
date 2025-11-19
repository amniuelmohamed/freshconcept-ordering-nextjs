import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Suspense } from "react";

import { getOrderById } from "@/lib/data/orders";
import { requirePagePermission } from "@/lib/auth/page-permissions";
import { formatPrice } from "@/lib/utils/pricing";
import type { LocalePageProps } from "@/types/next";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OrderDetailForm } from "@/components/employee/order-detail-form";
import { PrintOrderButton } from "@/components/employee/print-order-button";
import { EmployeeFormSkeleton } from "@/components/ui/skeleton-cards";
import type { Locale } from "@/i18n/routing";

type OrderDetailPageProps = LocalePageProps<{ id: string }>;

function formatDate(dateString: string | null, locale: string): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "full",
  }).format(date);
}

function getStatusBadgeVariant(status: string | null): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "pending":
      return "outline";
    case "confirmed":
      return "default";
    case "shipped":
    case "delivered":
      return "default";
    case "cancelled":
      return "destructive";
    default:
      return "secondary";
  }
}

function getStatusBadgeClass(status: string | null): string {
  switch (status) {
    case "pending":
      return "border-yellow-500 text-yellow-700 dark:text-yellow-400";
    case "confirmed":
      return "bg-blue-500 hover:bg-blue-600";
    case "shipped":
      return "bg-purple-500 hover:bg-purple-600";
    case "delivered":
      return "bg-green-500 hover:bg-green-600";
    case "cancelled":
      return "";
    default:
      return "";
  }
}

async function OrderDetailContent({
  locale,
  id,
}: {
  locale: Locale;
  id: string;
}) {
  const t = await getTranslations({
    locale,
    namespace: "employeeOrders",
  });

  const orderData = await getOrderById(id);

  if (!orderData) {
    notFound();
  }

  const order = orderData as typeof orderData & {
    items: Array<{
      id: string;
      product_name: string | null;
      quantity: number | null;
      unit_price: number | null;
      subtotal: number | null;
    }>;
  };

  const client = order.clients;

  return (
    <div className="flex flex-1 flex-col gap-6 print-container">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {t("detail.title", { orderId: id.slice(0, 8) })}
          </h1>
          <p className="text-sm text-muted-foreground">{t("detail.subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2 print-hide">
          <PrintOrderButton />
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href={`/${locale}/employee/orders`}>
              {t("detail.backToList")}
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Main content */}
        <div className="space-y-6">
          {/* Order Items - screen layout */}
          <Card className="print-hide">
            <CardHeader>
              <CardTitle>{t("detail.items.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
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
                      className="grid gap-3 rounded-lg border border-border p-4 text-sm md:grid-cols-[2fr_1fr_1fr_1fr] md:items-center md:gap-4"
                    >
                      <p className="font-semibold text-foreground">
                        {item.product_name ?? "-"}
                      </p>
                      <p className="text-center text-muted-foreground">
                        {item.quantity?.toFixed(2) ?? "-"}
                      </p>
                      <p className="text-center text-muted-foreground">
                        {item.unit_price
                          ? formatPrice(item.unit_price, locale, "EUR")
                          : "-"}
                      </p>
                      <p className="text-right font-semibold text-foreground">
                        {item.subtotal
                          ? formatPrice(item.subtotal, locale, "EUR")
                          : "-"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Items - print-friendly layout */}
          <div className="print-only">
            <h2 className="mb-2 text-lg font-semibold text-foreground">
              {t("detail.items.title")}
            </h2>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border border-border px-2 py-1 text-left">
                    {t("detail.items.table.product")}
                  </th>
                  <th className="border border-border px-2 py-1 text-right">
                    {t("detail.items.table.quantity")}
                  </th>
                  <th className="border border-border px-2 py-1 text-right">
                    {t("detail.items.table.unitPrice")}
                  </th>
                  <th className="border border-border px-2 py-1 text-right">
                    {t("detail.items.table.subtotal")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="border border-border px-2 py-1">
                      {item.product_name ?? "-"}
                    </td>
                    <td className="border border-border px-2 py-1 text-right">
                      {item.quantity?.toFixed(2) ?? "-"}
                    </td>
                    <td className="border border-border px-2 py-1 text-right">
                      {item.unit_price
                        ? formatPrice(item.unit_price, locale, "EUR")
                        : "-"}
                    </td>
                    <td className="border border-border px-2 py-1 text-right">
                      {item.subtotal
                        ? formatPrice(item.subtotal, locale, "EUR")
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order Info */}
          <Card>
            <CardHeader>
              <CardTitle>{t("detail.info.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  {t("detail.info.status")}
                </p>
                <div className="mt-1">
                  <Badge variant={getStatusBadgeVariant(order.status)} className={getStatusBadgeClass(order.status)}>
                    {order.status
                      ? t(`status.${order.status}`)
                      : t("status.unknown")}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  {t("detail.info.created")}
                </p>
                <p className="text-sm text-foreground">
                  {formatDate(order.created_at, locale)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  {t("detail.info.deliveryDate")}
                </p>
                <p className="text-sm text-foreground">
                  {formatDate(order.delivery_date, locale)}
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
            </CardContent>
          </Card>

          {/* Client Info */}
          {client ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("detail.client.title")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {client.company_name ? (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      {t("detail.client.company")}
                    </p>
                    <p className="text-foreground">{client.company_name}</p>
                  </div>
                ) : null}
                {client.contact_name ? (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      {t("detail.client.contact")}
                    </p>
                    <p className="text-foreground">{client.contact_name}</p>
                  </div>
                ) : null}
                {client.contact_email ? (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      {t("detail.client.email")}
                    </p>
                    <p className="text-foreground">{client.contact_email}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {/* Update Form - hide on print */}
          <div className="print-hide">
            <OrderDetailForm locale={locale} order={order} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function EmployeeOrderDetailPage({
  params,
}: OrderDetailPageProps) {
  const { locale, id } = await params;
  await requirePagePermission(locale, ["view_orders", "manage_orders"]);

  return (
    <Suspense fallback={<EmployeeFormSkeleton />}>
      <OrderDetailContent locale={locale} id={id} />
    </Suspense>
  );
}
