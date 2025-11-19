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

type EmployeeRoleOption = {
  id: string;
  label: string;
};

type EmployeesFiltersProps = {
  roles: EmployeeRoleOption[];
};

export function EmployeesFilters({ roles }: EmployeesFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("employeeEmployees.filters");

  const currentSearch = searchParams.get("search") ?? "";
  const currentRole = searchParams.get("role") ?? "";

  const [searchValue, setSearchValue] = useState(currentSearch);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

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

  const handleRoleChange = (value: string) => {
    updateParams({
      role: value === "all" ? null : value,
    });
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
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

            if (debounceRef.current) {
              clearTimeout(debounceRef.current);
            }

            debounceRef.current = setTimeout(() => {
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
            {t("roleLabel")}
          </span>
          <Select
            value={currentRole || undefined}
            onValueChange={handleRoleChange}
            disabled={isPending}
          >
            <SelectTrigger className="w-full min-w-[200px]">
              <SelectValue placeholder={t("allRoles")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allRoles")}</SelectItem>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}


