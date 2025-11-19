"use client";

import { OrdersDateFilters as SharedOrdersDateFilters } from "@/components/shared/orders-date-filters";

type OrdersDateFiltersProps = {
  locale: string;
  // Keep for backward compatibility, but not used anymore
  searchParams?: {
    status?: string;
    clientId?: string;
    clientSearch?: string;
    orderId?: string;
    dateFrom?: string;
    dateTo?: string;
    createdFrom?: string;
    createdTo?: string;
  };
};

export function OrdersDateFilters({ locale }: OrdersDateFiltersProps) {
  return (
    <SharedOrdersDateFilters
      locale={locale}
      basePath={`/${locale}/employee/orders`}
      translationNamespace="employeeOrders.filters"
      preserveFields={["status", "orderId", "clientSearch", "clientId"]}
    />
  );
}


