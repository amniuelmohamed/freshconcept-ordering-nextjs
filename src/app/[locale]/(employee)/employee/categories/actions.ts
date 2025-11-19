"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/routing";
import { requirePermission } from "@/lib/auth/permissions";
import type { TablesInsert, TablesUpdate } from "@/types/database";

const createCategorySchema = z.object({
  nameFr: z.string().min(1, "French name is required"),
  nameNl: z.string().min(1, "Dutch name is required"),
  nameEn: z.string().min(1, "English name is required"),
  descriptionFr: z.string().optional(),
  descriptionNl: z.string().optional(),
  descriptionEn: z.string().optional(),
});

const updateCategorySchema = createCategorySchema.partial().extend({
  categoryId: z.string().uuid(),
});

export type CreateCategoryResult =
  | { status: "success"; categoryId: string }
  | { status: "error"; code: "validation-error" | "create-error" | "unauthorized" };

export type UpdateCategoryResult =
  | { status: "success" }
  | { status: "error"; code: "validation-error" | "not-found" | "update-error" | "unauthorized" };

export async function createCategoryAction(
  locale: Locale,
  formData: FormData,
): Promise<CreateCategoryResult> {
  await requirePermission(locale, "manage_products");

  const parsed = createCategorySchema.safeParse({
    nameFr: formData.get("nameFr"),
    nameNl: formData.get("nameNl"),
    nameEn: formData.get("nameEn"),
    descriptionFr: formData.get("descriptionFr") || undefined,
    descriptionNl: formData.get("descriptionNl") || undefined,
    descriptionEn: formData.get("descriptionEn") || undefined,
  });

  if (!parsed.success) {
    return { status: "error", code: "validation-error" };
  }

  const supabase = await createClient();

  const categoryInput: TablesInsert<"categories"> = {
    name: {
      fr: parsed.data.nameFr,
      nl: parsed.data.nameNl,
      en: parsed.data.nameEn,
    },
    description: parsed.data.descriptionFr || parsed.data.descriptionNl || parsed.data.descriptionEn
      ? {
          fr: parsed.data.descriptionFr ?? null,
          nl: parsed.data.descriptionNl ?? null,
          en: parsed.data.descriptionEn ?? null,
        }
      : null,
  };

  const { data: category, error } = await supabase
    .from("categories")
    .insert(categoryInput)
    .select("id")
    .single();

  if (error || !category) {
    console.error("Error creating category:", error);
    return { status: "error", code: "create-error" };
  }

  revalidatePath(`/${locale}/employee/categories`);
  return { status: "success", categoryId: category.id };
}

export async function updateCategoryAction(
  locale: Locale,
  formData: FormData,
): Promise<UpdateCategoryResult> {
  await requirePermission(locale, "manage_products");

  const parsed = updateCategorySchema.safeParse({
    categoryId: formData.get("categoryId"),
    nameFr: formData.get("nameFr") || undefined,
    nameNl: formData.get("nameNl") || undefined,
    nameEn: formData.get("nameEn") || undefined,
    descriptionFr: formData.get("descriptionFr") || undefined,
    descriptionNl: formData.get("descriptionNl") || undefined,
    descriptionEn: formData.get("descriptionEn") || undefined,
  });

  if (!parsed.success) {
    return { status: "error", code: "validation-error" };
  }

  const supabase = await createClient();

  // Verify category exists
  const { data: existingCategory, error: fetchError } = await supabase
    .from("categories")
    .select("id, name, description")
    .eq("id", parsed.data.categoryId)
    .single();

  if (fetchError || !existingCategory) {
    return { status: "error", code: "not-found" };
  }

  // Build update object
  const updateData: TablesUpdate<"categories"> = {};

  if (parsed.data.nameFr || parsed.data.nameNl || parsed.data.nameEn) {
    const currentName = existingCategory.name as { fr?: string; nl?: string; en?: string } | null;
    updateData.name = {
      fr: parsed.data.nameFr ?? currentName?.fr ?? "",
      nl: parsed.data.nameNl ?? currentName?.nl ?? "",
      en: parsed.data.nameEn ?? currentName?.en ?? "",
    };
  }

  if (
    parsed.data.descriptionFr !== undefined ||
    parsed.data.descriptionNl !== undefined ||
    parsed.data.descriptionEn !== undefined
  ) {
    const currentDesc = existingCategory.description as { fr?: string; nl?: string; en?: string } | null;
    updateData.description = {
      fr: parsed.data.descriptionFr ?? currentDesc?.fr ?? null,
      nl: parsed.data.descriptionNl ?? currentDesc?.nl ?? null,
      en: parsed.data.descriptionEn ?? currentDesc?.en ?? null,
    };
  }

  // Only update if there are changes
  if (Object.keys(updateData).length === 0) {
    return { status: "success" };
  }

  const { error: updateError } = await supabase
    .from("categories")
    .update(updateData)
    .eq("id", parsed.data.categoryId);

  if (updateError) {
    console.error("Error updating category:", updateError);
    return { status: "error", code: "update-error" };
  }

  revalidatePath(`/${locale}/employee/categories/${parsed.data.categoryId}`);
  revalidatePath(`/${locale}/employee/categories`);

  return { status: "success" };
}

export type DeleteCategoryResult =
  | { status: "success" }
  | { status: "error"; code: "not-found" | "has-products" | "delete-error" | "unauthorized" };

export async function deleteCategoryAction(
  locale: Locale,
  categoryId: string,
): Promise<DeleteCategoryResult> {
  await requirePermission(locale, "manage_products");

  const supabase = await createClient();

  // Verify category exists
  const { data: existingCategory, error: fetchError } = await supabase
    .from("categories")
    .select("id")
    .eq("id", categoryId)
    .single();

  if (fetchError || !existingCategory) {
    return { status: "error", code: "not-found" };
  }

  // Check if any products are using this category
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id")
    .eq("category_id", categoryId)
    .limit(1);

  if (productsError) {
    console.error("Error checking products:", productsError);
    return { status: "error", code: "delete-error" };
  }

  if (products && products.length > 0) {
    return { status: "error", code: "has-products" };
  }

  // Delete the category
  const { error: deleteError } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId);

  if (deleteError) {
    console.error("Error deleting category:", deleteError);
    return { status: "error", code: "delete-error" };
  }

  revalidatePath(`/${locale}/employee/categories`);

  return { status: "success" };
}

