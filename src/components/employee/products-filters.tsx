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

type CategoryOption = {
  id: string;
  label: string;
};

type ProductsFiltersProps = {
  categories: CategoryOption[];
};

export function ProductsFilters({ categories }: ProductsFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("employeeProducts.filters");

  const currentCategory = searchParams.get("category") ?? "";
  const currentSort = searchParams.get("sort") ?? "created-desc";
  const currentSearch = searchParams.get("search") ?? "";
  const currentStatus = searchParams.get("status") ?? "";

  const [searchValue, setSearchValue] = useState(currentSearch);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local search value when URL changes externally
  useEffect(() => {
    setSearchValue(currentSearch);
  }, [currentSearch]);

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
      router.push(queryString ? `?${queryString}` : "?");
    });
  };

  const handleCategoryChange = (value: string) => {
    updateParams({
      category: value === "all" ? null : value,
      // Keep search and sort as they are (searchParams snapshot already has them)
    });
  };

  const handleSortChange = (value: string) => {
    updateParams({
      sort: value,
    });
  };

  const handleStatusChange = (value: string) => {
    updateParams({
      status: value === "all" ? null : value,
    });
  };

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="w-full md:max-w-md">
        <Input
          type="search"
          placeholder={t("searchPlaceholder")}
          value={searchValue}
          onChange={(e) => {
            const value = e.target.value;
            setSearchValue(value);

            // Clear existing timer
            if (debounceTimerRef.current) {
              clearTimeout(debounceTimerRef.current);
            }

            // Debounce URL update so typing stays smooth
            debounceTimerRef.current = setTimeout(() => {
              updateParams({
                search: value.trim() ? value : null,
              });
            }, 300);
          }}
        />
      </div>

      <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            {t("categoryLabel")}
          </span>
          <Select
            value={currentCategory || undefined}
            onValueChange={handleCategoryChange}
            disabled={isPending}
          >
            <SelectTrigger className="w-full min-w-[180px]">
              <SelectValue placeholder={t("allCategories")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allCategories")}</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            {t("statusLabel")}
          </span>
          <Select
            value={currentStatus || undefined}
            onValueChange={handleStatusChange}
            disabled={isPending}
          >
            <SelectTrigger className="w-full min-w-[160px]">
              <SelectValue placeholder={t("allStatuses")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allStatuses")}</SelectItem>
              <SelectItem value="active">{t("status.active")}</SelectItem>
              <SelectItem value="inactive">{t("status.inactive")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

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
              <SelectItem value="name-asc">{t("sort.nameAsc")}</SelectItem>
              <SelectItem value="name-desc">{t("sort.nameDesc")}</SelectItem>
              <SelectItem value="price-asc">{t("sort.priceAsc")}</SelectItem>
              <SelectItem value="price-desc">{t("sort.priceDesc")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}


