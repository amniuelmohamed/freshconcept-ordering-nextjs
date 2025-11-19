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

type OrdersFiltersProps = {
  locale: string;
};

export function OrdersFilters({ locale }: OrdersFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("employeeOrders.filters");

  const currentStatus = searchParams.get("status") ?? "";
  const currentOrderId = searchParams.get("orderId") ?? "";
  const currentClientSearch = searchParams.get("clientSearch") ?? "";

  const [orderIdValue, setOrderIdValue] = useState(currentOrderId);
  const [clientSearchValue, setClientSearchValue] = useState(currentClientSearch);

  const debounceOrderIdRef = useRef<NodeJS.Timeout | null>(null);
  const debounceClientRef = useRef<NodeJS.Timeout | null>(null);

  // Sync when URL changes externally (back/forward etc.)
  useEffect(() => {
    setOrderIdValue(currentOrderId);
  }, [currentOrderId]);

  useEffect(() => {
    setClientSearchValue(currentClientSearch);
  }, [currentClientSearch]);

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
      const basePath = `/${locale}/employee/orders`;
      router.push(queryString ? `${basePath}?${queryString}` : basePath);
    });
  };

  const handleStatusChange = (value: string) => {
    updateParams({ status: value === "all" ? null : value });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceOrderIdRef.current) clearTimeout(debounceOrderIdRef.current);
      if (debounceClientRef.current) clearTimeout(debounceClientRef.current);
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

        <div className="flex flex-1 flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            {t("client")}
          </span>
          <Input
            type="search"
            placeholder={t("clientPlaceholder")}
            value={clientSearchValue}
            onChange={(e) => {
              const value = e.target.value;
              setClientSearchValue(value);

              if (debounceClientRef.current) {
                clearTimeout(debounceClientRef.current);
              }

              debounceClientRef.current = setTimeout(() => {
                updateParams({
                  clientSearch: value.trim() ? value : null,
                });
              }, 300);
            }}
          />
        </div>
      </div>
    </div>
  );
}


