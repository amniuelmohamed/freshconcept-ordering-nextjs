"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

import {
  createClientRoleAction,
  updateClientRoleAction,
  type CreateClientRoleResult,
  type UpdateClientRoleResult,
} from "@/app/[locale]/(employee)/employee/client-roles/actions";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

type TranslatedName = {
  fr?: string;
  nl?: string;
  en?: string;
};

type ClientRoleFormProps = {
  locale: Locale;
  role?: {
    id: string;
    name: TranslatedName | null;
    slug: string;
    description: TranslatedName | null;
    default_delivery_days: string[] | null;
  };
};

const DAYS_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const clientRoleSchema = z.object({
  nameFr: z.string().min(1, "Required"),
  nameNl: z.string().min(1, "Required"),
  nameEn: z.string().min(1, "Required"),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens"),
  descriptionFr: z.string().optional(),
  descriptionNl: z.string().optional(),
  descriptionEn: z.string().optional(),
  defaultDeliveryDays: z
    .array(z.enum(DAYS_OF_WEEK))
    .min(1, "At least one day required"),
});

type ClientRoleFormValues = z.infer<typeof clientRoleSchema>;

export function ClientRoleForm({ locale, role }: ClientRoleFormProps) {
  const t = useTranslations("clientRoles.form");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<CreateClientRoleResult | UpdateClientRoleResult | null>(
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

  // Normalize delivery days from database (may be capitalized) to lowercase
  const normalizeDeliveryDays = (
    days: string[] | null,
  ): typeof DAYS_OF_WEEK[number][] => {
    if (!days || days.length === 0) return [];
    return days
      .map((day) => day.toLowerCase())
      .filter((day): day is typeof DAYS_OF_WEEK[number] =>
        DAYS_OF_WEEK.includes(day as typeof DAYS_OF_WEEK[number]),
      );
  };

  const form = useForm<ClientRoleFormValues>({
    resolver: zodResolver(clientRoleSchema),
    defaultValues: {
      nameFr: (role?.name as TranslatedName)?.fr ?? "",
      nameNl: (role?.name as TranslatedName)?.nl ?? "",
      nameEn: (role?.name as TranslatedName)?.en ?? "",
      slug: role?.slug ?? "",
      descriptionFr: (role?.description as TranslatedName)?.fr ?? "",
      descriptionNl: (role?.description as TranslatedName)?.nl ?? "",
      descriptionEn: (role?.description as TranslatedName)?.en ?? "",
      defaultDeliveryDays: normalizeDeliveryDays(role?.default_delivery_days ?? null),
    },
  });

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
      formData.append("slug", values.slug);
      if (values.descriptionFr) formData.append("descriptionFr", values.descriptionFr);
      if (values.descriptionNl) formData.append("descriptionNl", values.descriptionNl);
      if (values.descriptionEn) formData.append("descriptionEn", values.descriptionEn);
      formData.append("defaultDeliveryDays", JSON.stringify(values.defaultDeliveryDays));

      const actionResult = isEditing
        ? await updateClientRoleAction(locale, formData)
        : await createClientRoleAction(locale, formData);

      setResult(actionResult);

      if (actionResult.status === "success") {
        if (!isEditing && "roleId" in actionResult) {
          router.push(`/${locale}/employee/client-roles/${actionResult.roleId}`);
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
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("slug.label")}</FormLabel>
              <FormControl>
                <Input {...field} disabled={isEditing} />
              </FormControl>
              <FormDescription>{t("slug.description")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="descriptionFr"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("description.fr")}</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={3} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="descriptionNl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("description.nl")}</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={3} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="descriptionEn"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("description.en")}</FormLabel>
              <FormControl>
                <Textarea {...field} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="defaultDeliveryDays"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("deliveryDays.label")}</FormLabel>
              <FormDescription>{t("deliveryDays.description")}</FormDescription>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {DAYS_OF_WEEK.map((day) => (
                  <label
                    key={day}
                    className="flex items-center gap-3 rounded-md border border-input p-3 hover:bg-accent cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={field.value.includes(day)}
                      onCheckedChange={(checked) => {
                        const current = field.value;
                        if (checked) {
                          field.onChange([...current, day]);
                        } else {
                          field.onChange(current.filter((d) => d !== day));
                        }
                      }}
                    />
                    <span className="text-sm font-medium capitalize">{t(`deliveryDays.${day}`)}</span>
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

