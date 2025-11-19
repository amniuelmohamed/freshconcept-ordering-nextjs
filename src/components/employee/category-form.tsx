"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

import {
  createCategoryAction,
  updateCategoryAction,
  type CreateCategoryResult,
  type UpdateCategoryResult,
} from "@/app/[locale]/(employee)/employee/categories/actions";
import type { Locale } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type TranslatedName = {
  fr?: string;
  nl?: string;
  en?: string;
};

type CategoryFormProps = {
  locale: Locale;
  category?: {
    id: string;
    name: TranslatedName | null;
    description: TranslatedName | null;
  };
};

const categorySchema = z.object({
  nameFr: z.string().min(1, "Required"),
  nameNl: z.string().min(1, "Required"),
  nameEn: z.string().min(1, "Required"),
  descriptionFr: z.string().optional(),
  descriptionNl: z.string().optional(),
  descriptionEn: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

export function CategoryForm({ locale, category }: CategoryFormProps) {
  const t = useTranslations("categories.form");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<CreateCategoryResult | UpdateCategoryResult | null>(
    null,
  );

  const isEditing = !!category;

  useEffect(() => {
    if (result?.status === "success") {
      toast.success(isEditing ? t("updateSuccess") : t("createSuccess"));
    } else if (result?.status === "error") {
      toast.error(t(`errors.${result.code}`));
    }
  }, [result, isEditing, t]);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      nameFr: (category?.name as TranslatedName)?.fr ?? "",
      nameNl: (category?.name as TranslatedName)?.nl ?? "",
      nameEn: (category?.name as TranslatedName)?.en ?? "",
      descriptionFr: (category?.description as TranslatedName)?.fr ?? "",
      descriptionNl: (category?.description as TranslatedName)?.nl ?? "",
      descriptionEn: (category?.description as TranslatedName)?.en ?? "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setResult(null);
    form.clearErrors();

    startTransition(async () => {
      const formData = new FormData();
      
      if (isEditing && category) {
        formData.append("categoryId", category.id);
      }
      
      formData.append("nameFr", values.nameFr);
      formData.append("nameNl", values.nameNl);
      formData.append("nameEn", values.nameEn);
      if (values.descriptionFr) formData.append("descriptionFr", values.descriptionFr);
      if (values.descriptionNl) formData.append("descriptionNl", values.descriptionNl);
      if (values.descriptionEn) formData.append("descriptionEn", values.descriptionEn);

      const actionResult = isEditing
        ? await updateCategoryAction(locale, formData)
        : await createCategoryAction(locale, formData);

      setResult(actionResult);

      if (actionResult.status === "success") {
        if (!isEditing && "categoryId" in actionResult) {
          router.push(`/${locale}/employee/categories/${actionResult.categoryId}`);
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

