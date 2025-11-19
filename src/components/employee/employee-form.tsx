"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

import {
  createEmployeeAction,
  updateEmployeeAction,
  type CreateEmployeeResult,
  type UpdateEmployeeResult,
} from "@/app/[locale]/(employee)/employee/employees/actions";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TranslatedName = {
  fr?: string;
  nl?: string;
  en?: string;
};

type EmployeeRole = {
  id: string;
  name: TranslatedName | null;
};

type EmployeeFormProps = {
  locale: Locale;
  roles: EmployeeRole[];
  employee?: {
    id: string;
    full_name: string | null;
    employee_role_id: string | null;
    email?: string | null;
  };
};

const employeeCreationSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  employeeRoleId: z.string().uuid(),
});

const updateEmployeeSchema = employeeCreationSchema.partial().extend({
  employeeId: z.string().uuid().optional(),
});

type EmployeeFormValues = z.infer<typeof employeeCreationSchema> & {
  employeeId?: string;
};

function getRoleName(name: TranslatedName | null, locale: string): string {
  if (!name || typeof name !== "object") return "-";
  return (name[locale as keyof TranslatedName] as string) ?? name.fr ?? name.nl ?? name.en ?? "-";
}

export function EmployeeForm({ locale, roles, employee }: EmployeeFormProps) {
  const t = useTranslations("employeeEmployees.form");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<CreateEmployeeResult | UpdateEmployeeResult | null>(null);

  const isEditing = !!employee;

  useEffect(() => {
    if (result?.status === "success") {
      toast.success(isEditing ? t("updateSuccess") : t("createSuccess"));
    } else if (result?.status === "error") {
      toast.error(t(`errors.${result.code}`));
    }
  }, [result, isEditing, t]);

  const form = useForm<EmployeeFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(isEditing ? updateEmployeeSchema : employeeCreationSchema) as any,
    defaultValues: {
      email: employee?.email ?? "",
      fullName: employee?.full_name ?? "",
      employeeRoleId: employee?.employee_role_id ?? "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setResult(null);
    form.clearErrors();

    startTransition(async () => {
      const formData = new FormData();

      if (isEditing && employee) {
        formData.append("employeeId", employee.id);
      }

      if (values.email) formData.append("email", values.email);
      if (values.fullName) formData.append("fullName", values.fullName);
      if (values.employeeRoleId) formData.append("employeeRoleId", values.employeeRoleId);

      const actionResult = isEditing
        ? await updateEmployeeAction(locale, formData)
        : await createEmployeeAction(locale, formData);

      setResult(actionResult);

      if (actionResult.status === "success") {
        if (!isEditing && "employeeId" in actionResult) {
          router.push(`/${locale}/employee/employees/${actionResult.employeeId}`);
        } else {
          router.refresh();
        }
      }
    });
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("email.label")}</FormLabel>
              <FormControl>
                <Input type="email" {...field} disabled={isEditing} />
              </FormControl>
              <FormDescription>
                {isEditing ? t("email.descriptionEdit") : t("email.description")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("fullName.label")}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="employeeRoleId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("role.label")}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("role.placeholder")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {getRoleName(role.name, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

