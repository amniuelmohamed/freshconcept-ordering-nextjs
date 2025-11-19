"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

import {
  createEmployeeRoleAction,
  updateEmployeeRoleAction,
  type CreateEmployeeRoleResult,
  type UpdateEmployeeRoleResult,
} from "@/app/[locale]/(employee)/employee/employee-roles/actions";
import type { Locale } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

type TranslatedName = {
  fr?: string;
  nl?: string;
  en?: string;
};

type EmployeeRoleFormProps = {
  locale: Locale;
  availablePermissions: string[];
  role?: {
    id: string;
    name: TranslatedName | null;
    permissions: Record<string, boolean> | null;
  };
};

const employeeRoleSchema = z.object({
  nameFr: z.string().min(1, "Required"),
  nameNl: z.string().min(1, "Required"),
  nameEn: z.string().min(1, "Required"),
  permissions: z.record(z.string(), z.boolean()).optional(),
});

type EmployeeRoleFormValues = z.infer<typeof employeeRoleSchema>;

export function EmployeeRoleForm({ locale, availablePermissions, role }: EmployeeRoleFormProps) {
  const t = useTranslations("employeeRoles.form");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<CreateEmployeeRoleResult | UpdateEmployeeRoleResult | null>(
    null,
  );

  const isEditing = !!role;

  useEffect(() => {
    if (result?.status === "success") {
      toast.success(isEditing ? t("updateSuccess") : t("createSuccess"));
    } else if (result?.status === "error") {
      toast.error(t(`errors.${result.code}`));
    }
  }, [result, isEditing, t]);

  // Normalize permissions: ensure all available permissions are in the object
  const normalizePermissions = (
    rolePermissions: Record<string, boolean> | null | undefined,
  ): Record<string, boolean> => {
    const normalized: Record<string, boolean> = {};
    
    // Initialize all available permissions to false
    availablePermissions.forEach((perm) => {
      normalized[perm] = false;
    });
    
    // Override with role permissions if they exist
    if (rolePermissions && typeof rolePermissions === "object") {
      Object.keys(rolePermissions).forEach((key) => {
        if (availablePermissions.includes(key)) {
          normalized[key] = rolePermissions[key] === true;
        }
      });
    }
    
    return normalized;
  };

  const form = useForm<EmployeeRoleFormValues>({
    resolver: zodResolver(employeeRoleSchema),
    defaultValues: {
      nameFr: (role?.name as TranslatedName)?.fr ?? "",
      nameNl: (role?.name as TranslatedName)?.nl ?? "",
      nameEn: (role?.name as TranslatedName)?.en ?? "",
      permissions: normalizePermissions(role?.permissions as Record<string, boolean> | null),
    },
  });

  const permissions = useWatch({ control: form.control, name: "permissions" }) || {};

  const onSubmit = form.handleSubmit((values) => {
    setResult(null);
    form.clearErrors();

    startTransition(async () => {
      const formData = new FormData();
      
      if (isEditing && role) {
        formData.append("roleId", role.id);
      }
      
      formData.append("nameFr", values.nameFr);
      formData.append("nameNl", values.nameNl);
      formData.append("nameEn", values.nameEn);
      
      // Filter permissions to only include those set to true
      const filteredPermissions: Record<string, boolean> = {};
      Object.keys(values.permissions || {}).forEach((key) => {
        if (values.permissions?.[key] === true) {
          filteredPermissions[key] = true;
        }
      });
      formData.append("permissions", JSON.stringify(filteredPermissions));

      const actionResult = isEditing
        ? await updateEmployeeRoleAction(locale, formData)
        : await createEmployeeRoleAction(locale, formData);

      setResult(actionResult);

      if (actionResult.status === "success") {
        if (!isEditing && "roleId" in actionResult) {
          router.push(`/${locale}/employee/employee-roles/${actionResult.roleId}`);
        } else {
          router.refresh();
        }
      }
    });
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="nameFr"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("name.fr")}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="nameNl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("name.nl")}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="nameEn"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("name.en")}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="permissions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("permissions.label")}</FormLabel>
              <FormDescription>{t("permissions.description")}</FormDescription>
              <div className="grid gap-2 md:grid-cols-2">
                {availablePermissions.map((permission) => (
                  <label
                    key={permission}
                    className="flex items-center gap-3 rounded-md border border-input p-3 hover:bg-accent cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={permissions[permission] === true}
                      onCheckedChange={(checked) => {
                        const current = field.value || {};
                        field.onChange({
                          ...current,
                          [permission]: checked === true,
                        });
                      }}
                    />
                    <span className="text-sm font-medium">
                      {t(`permissions.${permission}`) || permission}
                    </span>
                  </label>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-4">
          <Button type="submit" disabled={isPending}>
            {isPending
              ? isEditing
                ? t("updating")
                : t("creating")
              : isEditing
                ? t("update")
                : t("create")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isPending}
          >
            {t("cancel")}
          </Button>
        </div>
      </form>
    </Form>
  );
}

