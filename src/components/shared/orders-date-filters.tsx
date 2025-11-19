"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CalendarRange } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type OrdersDateFiltersProps = {
  locale: string;
  basePath: string; // e.g., "/en/orders" or "/en/employee/orders"
  translationNamespace: string; // e.g., "clientOrders.filters" or "employeeOrders.filters"
  // Fields to preserve when updating date filters
  preserveFields?: string[]; // e.g., ["status", "orderId", "sort"]
};

export function OrdersDateFilters({
  basePath,
  translationNamespace,
  preserveFields = [],
}: OrdersDateFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations(translationNamespace);

  // Get current date filter values
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";
  const createdFrom = searchParams.get("createdFrom") ?? "";
  const createdTo = searchParams.get("createdTo") ?? "";

  // Open if any date filter is active
  const hasActiveFilters = Boolean(dateFrom || dateTo || createdFrom || createdTo);
  const [isOpen, setIsOpen] = useState(hasActiveFilters);

  // Get local state for date inputs - initialize from URL params
  const [dateFromValue, setDateFromValue] = useState(dateFrom);
  const [dateToValue, setDateToValue] = useState(dateTo);
  const [createdFromValue, setCreatedFromValue] = useState(createdFrom);
  const [createdToValue, setCreatedToValue] = useState(createdTo);

  // Use ref to track previous URL params to detect external changes (e.g., browser back/forward)
  const prevParamsKeyRef = useRef(`${dateFrom}|${dateTo}|${createdFrom}|${createdTo}`);

  // Sync local state with URL params when they change externally (e.g., browser back/forward)
  useEffect(() => {
    const currentParamsKey = `${dateFrom}|${dateTo}|${createdFrom}|${createdTo}`;
    
    // Only update if params actually changed externally
    if (prevParamsKeyRef.current !== currentParamsKey) {
      prevParamsKeyRef.current = currentParamsKey;
      
      // Use startTransition to defer state updates and avoid cascading renders
      startTransition(() => {
        setDateFromValue(dateFrom);
        setDateToValue(dateTo);
        setCreatedFromValue(createdFrom);
        setCreatedToValue(createdTo);
        setIsOpen(hasActiveFilters);
      });
    }
  }, [dateFrom, dateTo, createdFrom, createdTo, hasActiveFilters, startTransition]);

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    // Preserve specified fields
    preserveFields.forEach((field) => {
      const value = searchParams.get(field);
      if (value) {
        params.set(field, value);
      }
    });

    // Apply date filter updates
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    startTransition(() => {
      const queryString = params.toString();
      router.push(queryString ? `${basePath}?${queryString}` : basePath);
    });
  };

  const handleApply = () => {
    updateParams({
      dateFrom: dateFromValue.trim() || null,
      dateTo: dateToValue.trim() || null,
      createdFrom: createdFromValue.trim() || null,
      createdTo: createdToValue.trim() || null,
    });
  };

  const handleClear = () => {
    setDateFromValue("");
    setDateToValue("");
    setCreatedFromValue("");
    setCreatedToValue("");
    updateParams({
      dateFrom: null,
      dateTo: null,
      createdFrom: null,
      createdTo: null,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsOpen((prev) => !prev)}
          className="inline-flex items-center gap-2"
          disabled={isPending}
        >
          <CalendarRange className="h-4 w-4" />
          <span>{isOpen ? t("hideDateFilters") : t("showDateFilters")}</span>
        </Button>
      </div>

      {isOpen && (
        <div className="space-y-4 rounded-lg border border-border bg-card p-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="dateFrom" className="text-sm font-medium text-foreground">
                {t("deliveryDateFrom")}
              </label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFromValue}
                onChange={(e) => setDateFromValue(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="dateTo" className="text-sm font-medium text-foreground">
                {t("deliveryDateTo")}
              </label>
              <Input
                id="dateTo"
                type="date"
                value={dateToValue}
                onChange={(e) => setDateToValue(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="createdFrom" className="text-sm font-medium text-foreground">
                {t("createdFrom")}
              </label>
              <Input
                id="createdFrom"
                type="date"
                value={createdFromValue}
                onChange={(e) => setCreatedFromValue(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="createdTo" className="text-sm font-medium text-foreground">
                {t("createdTo")}
              </label>
              <Input
                id="createdTo"
                type="date"
                value={createdToValue}
                onChange={(e) => setCreatedToValue(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="button" onClick={handleApply} disabled={isPending}>
              {t("apply")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleClear}
              disabled={isPending}
            >
              {t("clear")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

