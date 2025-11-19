"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ClientOrdersFiltersProps = {
  locale: string;
};

export function ClientOrdersFilters({ locale }: ClientOrdersFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("clientOrders.filters");

  const currentStatus = searchParams.get("status") ?? "";
  const currentOrderId = searchParams.get("orderId") ?? "";
  const currentSort = searchParams.get("sort") ?? "created-desc";

  const [orderIdValue, setOrderIdValue] = useState(currentOrderId);
  const debounceOrderIdRef = useRef<NodeJS.Timeout | null>(null);

  // Sync when URL changes externally (back/forward etc.)
  useEffect(() => {
    setOrderIdValue(currentOrderId);
  }, [currentOrderId]);

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    startTransition(() => {
      const queryString = params.toString();
      const basePath = `/${locale}/orders`;
      router.push(queryString ? `${basePath}?${queryString}` : basePath);
    });
  };

  const handleStatusChange = (value: string) => {
    updateParams({ status: value === "all" ? null : value });
  };

  const handleSortChange = (value: string) => {
    updateParams({ sort: value });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceOrderIdRef.current) clearTimeout(debounceOrderIdRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex w-full flex-col gap-3 md:flex-row md:items-center">
        <div className="flex flex-col gap-1 md:min-w-[180px]">
          <span className="text-xs font-medium text-muted-foreground">
            {t("status")}
          </span>
          <Select
            value={currentStatus || undefined}
            onValueChange={handleStatusChange}
            disabled={isPending}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("all")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("all")}</SelectItem>
              <SelectItem value="pending">{t("pending")}</SelectItem>
              <SelectItem value="confirmed">{t("confirmed")}</SelectItem>
              <SelectItem value="shipped">{t("shipped")}</SelectItem>
              <SelectItem value="delivered">{t("delivered")}</SelectItem>
              <SelectItem value="cancelled">{t("cancelled")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-1 flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            {t("orderId")}
          </span>
          <Input
            type="search"
            placeholder={t("orderIdPlaceholder")}
            value={orderIdValue}
            onChange={(e) => {
              const value = e.target.value;
              setOrderIdValue(value);

              if (debounceOrderIdRef.current) {
                clearTimeout(debounceOrderIdRef.current);
              }

              debounceOrderIdRef.current = setTimeout(() => {
                updateParams({
                  orderId: value.trim() ? value : null,
                });
              }, 300);
            }}
          />
        </div>
      </div>

      <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            {t("sortLabel")}
          </span>
          <Select
            value={currentSort}
            onValueChange={handleSortChange}
            disabled={isPending}
          >
            <SelectTrigger className="w-full min-w-[180px]">
              <SelectValue placeholder={t("sort.createdDesc")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created-desc">{t("sort.createdDesc")}</SelectItem>
              <SelectItem value="created-asc">{t("sort.createdAsc")}</SelectItem>
              <SelectItem value="delivery-desc">{t("sort.deliveryDesc")}</SelectItem>
              <SelectItem value="delivery-asc">{t("sort.deliveryAsc")}</SelectItem>
              <SelectItem value="amount-desc">{t("sort.amountDesc")}</SelectItem>
              <SelectItem value="amount-asc">{t("sort.amountAsc")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

