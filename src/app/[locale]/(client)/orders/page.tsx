import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { getSession } from "@/lib/auth/session";
import { getOrders } from "@/lib/data/orders";
import type { LocalePageProps } from "@/types/next";
import type { Locale } from "@/i18n/routing";
import { formatPrice } from "@/lib/utils/pricing";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "@/components/client/order-status-badge";
import { OrdersTableSkeleton } from "@/components/ui/skeleton-cards";
import { ClientOrdersFilters } from "@/components/client/orders-filters";
import { OrdersDateFilters } from "@/components/shared/orders-date-filters";

function formatDate(dateString: string | null, locale: Locale): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
  }).format(date);
}

type ClientOrdersPageProps = LocalePageProps & {
  searchParams: Promise<{
    status?: string;
    orderId?: string;
    sort?: string;
    dateFrom?: string;
    dateTo?: string;
    createdFrom?: string;
    createdTo?: string;
  }>;
};

async function OrdersContent({
  locale,
  searchParams,
}: {
  locale: Locale;
  searchParams: {
    status?: string;
    orderId?: string;
    sort?: string;
    dateFrom?: string;
    dateTo?: string;
    createdFrom?: string;
    createdTo?: string;
  };
}) {
  const t = await getTranslations({ locale, namespace: "clientOrders" });

  const session = await getSession();
  const clientId = session?.clientProfile?.id ?? null;

  // Get orders with filters
  const orders = clientId
    ? await getOrders({
        clientId,
        status: searchParams.status,
        orderId: searchParams.orderId,
        dateFrom: searchParams.dateFrom,
        dateTo: searchParams.dateTo,
        createdFrom: searchParams.createdFrom,
        createdTo: searchParams.createdTo,
        limit: 100,
      })
    : [];

  // Sort orders client-side based on sort parameter
  const sortKey = searchParams.sort ?? "created-desc";
  const sortedOrders = [...orders].sort((a, b) => {
    switch (sortKey) {
      case "created-asc": {
        const dateA = new Date(a.created_at ?? 0).getTime();
        const dateB = new Date(b.created_at ?? 0).getTime();
        return dateA - dateB;
      }
      case "created-desc": {
        const dateA = new Date(a.created_at ?? 0).getTime();
        const dateB = new Date(b.created_at ?? 0).getTime();
        return dateB - dateA;
      }
      case "delivery-asc": {
        const dateA = new Date(a.delivery_date ?? 0).getTime();
        const dateB = new Date(b.delivery_date ?? 0).getTime();
        return dateA - dateB;
      }
      case "delivery-desc": {
        const dateA = new Date(a.delivery_date ?? 0).getTime();
        const dateB = new Date(b.delivery_date ?? 0).getTime();
        return dateB - dateA;
      }
      case "amount-asc": {
        const amountA = Number(a.estimated_total ?? 0);
        const amountB = Number(b.estimated_total ?? 0);
        return amountA - amountB;
      }
      case "amount-desc": {
        const amountA = Number(a.estimated_total ?? 0);
        const amountB = Number(b.estimated_total ?? 0);
        return amountB - amountA;
      }
      default:
        return 0;
    }
  });

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <ClientOrdersFilters locale={locale} />

      <OrdersDateFilters
        locale={locale}
        basePath={`/${locale}/orders`}
        translationNamespace="clientOrders.filters"
        preserveFields={["status", "orderId", "sort"]}
      />

      {sortedOrders.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("empty.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("empty.subtitle")}
            </p>
            <Button asChild>
              <Link href={`/${locale}/quick-order`}>
                {t("empty.cta")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-t-4 border-t-primary hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-xl">{t("table.title")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("table.orderId")}</TableHead>
                    <TableHead>{t("table.created")}</TableHead>
                    <TableHead>{t("table.deliveryDate")}</TableHead>
                    <TableHead>{t("table.status")}</TableHead>
                    <TableHead className="text-right">{t("table.estimatedTotal")}</TableHead>
                    <TableHead className="text-right">{t("table.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedOrders.map((order) => (
                    <TableRow
                      key={order.id}
                      className="group hover:bg-muted/30 transition-colors duration-200"
                    >
                      <TableCell className="font-mono text-sm group-hover:text-primary transition-colors">
                        {order.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(order.created_at, locale)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(order.delivery_date, locale)}
                      </TableCell>
                      <TableCell>
                        <OrderStatusBadge status={order.status || "pending"} />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {order.estimated_total
                          ? formatPrice(order.estimated_total, locale, "EUR")
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm" className="hover:bg-primary hover:text-primary-foreground transition-colors">
                          <Link href={`/${locale}/orders/${order.id}`}>
                            {t("table.view")}
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

export default async function ClientOrdersPage({
  params,
  searchParams,
}: ClientOrdersPageProps) {
  const { locale } = await params;
  const resolvedSearchParams = await searchParams;

  return (
    <Suspense fallback={<OrdersTableSkeleton />}>
      <OrdersContent locale={locale} searchParams={resolvedSearchParams} />
    </Suspense>
  );
}

