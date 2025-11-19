import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { getOrders } from "@/lib/data/orders";
import type { LocalePageProps } from "@/types/next";
import type { Locale } from "@/i18n/routing";
import { requirePagePermission } from "@/lib/auth/page-permissions";
import { OrdersFilters } from "@/components/employee/orders-filters";
import { OrdersDateFilters } from "@/components/employee/orders-date-filters";
import { EmployeeOrdersTable } from "@/components/employee/orders-table";
import { OrdersTableSkeleton } from "@/components/ui/skeleton-cards";

type OrdersPageProps = LocalePageProps & {
  searchParams: Promise<{
    status?: string;
    clientId?: string;
    clientSearch?: string;
    orderId?: string;
    dateFrom?: string;
    dateTo?: string;
    createdFrom?: string;
    createdTo?: string;
  }>;
};

async function OrdersTable({
  locale,
  searchParams,
}: {
  locale: Locale;
  searchParams: {
    status?: string;
    clientId?: string;
    clientSearch?: string;
    orderId?: string;
    dateFrom?: string;
    dateTo?: string;
    createdFrom?: string;
    createdTo?: string;
  };
}) {
  const t = await getTranslations({
    locale,
    namespace: "employeeOrders",
  });
  const orders = await getOrders({
    status: searchParams.status,
    clientId: searchParams.clientId,
    clientSearch: searchParams.clientSearch,
    orderId: searchParams.orderId,
    dateFrom: searchParams.dateFrom,
    dateTo: searchParams.dateTo,
    createdFrom: searchParams.createdFrom,
    createdTo: searchParams.createdTo,
  });

  if (orders.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        {t("table.noOrders")}
      </div>
    );
  }

  return (
    <EmployeeOrdersTable locale={locale} orders={orders} />
  );
}

export default async function EmployeeOrdersPage({
  params,
  searchParams,
}: OrdersPageProps) {
  const { locale } = await params;
  await requirePagePermission(locale, ["view_orders", "manage_orders"]);
  const t = await getTranslations({
    locale,
    namespace: "employeeOrders",
  });

  const resolvedSearchParams = await searchParams;

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Live filters for status, orderId, clientSearch */}
      <OrdersFilters locale={locale} />

      {/* Toggleable date filters section */}
      <OrdersDateFilters locale={locale} />

      <Suspense fallback={<OrdersTableSkeleton />}>
        <OrdersTable locale={locale} searchParams={resolvedSearchParams} />
      </Suspense>
    </div>
  );
}
