"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/routing";
import { requirePermission } from "@/lib/auth/permissions";
import type { TablesInsert, TablesUpdate } from "@/types/database";

const createProductSchema = z.object({
  sku: z.string().optional(),
  nameFr: z.string().min(1, "French name is required"),
  nameNl: z.string().min(1, "Dutch name is required"),
  nameEn: z.string().min(1, "English name is required"),
  descriptionFr: z.string().optional(),
  descriptionNl: z.string().optional(),
  descriptionEn: z.string().optional(),
  categoryId: z.string().uuid().optional().nullable(),
  basePrice: z.number().min(0, "Price must be positive"),
  unit: z.string().optional(),
  approximateWeight: z.number().min(0).optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  visibleTo: z.array(z.string()).optional(),
  active: z.boolean().optional(),
});

const updateProductSchema = createProductSchema.partial().extend({
  productId: z.string().uuid(),
});

export type CreateProductResult =
  | { status: "success"; productId: string }
  | { status: "error"; code: "validation-error" | "create-error" | "unauthorized" };

export type UpdateProductResult =
  | { status: "success" }
  | { status: "error"; code: "validation-error" | "not-found" | "update-error" | "unauthorized" };

export async function createProductAction(
  locale: Locale,
  formData: FormData,
): Promise<CreateProductResult> {
  await requirePermission(locale, "manage_products");

  const parsed = createProductSchema.safeParse({
    sku: formData.get("sku") || undefined,
    nameFr: formData.get("nameFr"),
    nameNl: formData.get("nameNl"),
    nameEn: formData.get("nameEn"),
    descriptionFr: formData.get("descriptionFr") || undefined,
    descriptionNl: formData.get("descriptionNl") || undefined,
    descriptionEn: formData.get("descriptionEn") || undefined,
    categoryId: formData.get("categoryId") || undefined,
    basePrice: Number(formData.get("basePrice")),
    unit: formData.get("unit") || undefined,
    approximateWeight: formData.get("approximateWeight")
      ? Number(formData.get("approximateWeight"))
      : undefined,
    imageUrl: (() => {
      const value = formData.get("imageUrl");
      if (!value || String(value).trim() === "") return null;
      return String(value);
    })(),
    visibleTo: formData.get("visibleTo")
      ? JSON.parse(String(formData.get("visibleTo")))
      : [],
    active: formData.get("active") === "true" || formData.get("active") === "on",
  });

  if (!parsed.success) {
    return { status: "error", code: "validation-error" };
  }

  const supabase = await createClient();

  const productInput: TablesInsert<"products"> = {
    sku: parsed.data.sku || null,
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
    category_id: parsed.data.categoryId || null,
    base_price: parsed.data.basePrice,
    unit: parsed.data.unit || null,
    approximate_weight: parsed.data.approximateWeight || null,
    image_url: parsed.data.imageUrl || null,
    visible_to: parsed.data.visibleTo && parsed.data.visibleTo.length > 0
      ? parsed.data.visibleTo
      : null, // null means visible to all
    active: parsed.data.active ?? true,
  };

  const { data: product, error } = await supabase
    .from("products")
    .insert(productInput)
    .select("id")
    .single();

  if (error || !product) {
    console.error("Error creating product:", error);
    return { status: "error", code: "create-error" };
  }

  revalidatePath(`/${locale}/employee/products`);
  return { status: "success", productId: product.id };
}

export async function updateProductAction(
  locale: Locale,
  formData: FormData,
): Promise<UpdateProductResult> {
  await requirePermission(locale, "manage_products");

  const parsed = updateProductSchema.safeParse({
    productId: formData.get("productId"),
    sku: formData.get("sku") || undefined,
    nameFr: formData.get("nameFr") || undefined,
    nameNl: formData.get("nameNl") || undefined,
    nameEn: formData.get("nameEn") || undefined,
    descriptionFr: formData.get("descriptionFr") || undefined,
    descriptionNl: formData.get("descriptionNl") || undefined,
    descriptionEn: formData.get("descriptionEn") || undefined,
    categoryId: formData.get("categoryId") || undefined,
    basePrice: formData.get("basePrice") ? Number(formData.get("basePrice")) : undefined,
    unit: formData.get("unit") || undefined,
    approximateWeight: formData.get("approximateWeight")
      ? Number(formData.get("approximateWeight"))
      : undefined,
    imageUrl: (() => {
      const value = formData.get("imageUrl");
      if (!value || String(value).trim() === "") return null;
      return String(value);
    })(),
    visibleTo: formData.get("visibleTo")
      ? JSON.parse(String(formData.get("visibleTo")))
      : undefined,
    active: formData.get("active") ? formData.get("active") === "true" || formData.get("active") === "on" : undefined,
  });

  if (!parsed.success) {
    return { status: "error", code: "validation-error" };
  }

  const supabase = await createClient();

  // Verify product exists
  const { data: existingProduct, error: fetchError } = await supabase
    .from("products")
    .select("id, name, description")
    .eq("id", parsed.data.productId)
    .single();

  if (fetchError || !existingProduct) {
    return { status: "error", code: "not-found" };
  }

  // Build update object
  const updateData: TablesUpdate<"products"> = {};

  if (parsed.data.sku !== undefined) {
    updateData.sku = parsed.data.sku || null;
  }

  if (parsed.data.nameFr || parsed.data.nameNl || parsed.data.nameEn) {
    const currentName = existingProduct.name as { fr?: string; nl?: string; en?: string } | null;
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
    const currentDesc = existingProduct.description as { fr?: string; nl?: string; en?: string } | null;
    updateData.description = {
      fr: parsed.data.descriptionFr ?? currentDesc?.fr ?? null,
      nl: parsed.data.descriptionNl ?? currentDesc?.nl ?? null,
      en: parsed.data.descriptionEn ?? currentDesc?.en ?? null,
    };
  }

  if (parsed.data.categoryId !== undefined) {
    updateData.category_id = parsed.data.categoryId || null;
  }

  if (parsed.data.basePrice !== undefined) {
    updateData.base_price = parsed.data.basePrice;
  }

  if (parsed.data.unit !== undefined) {
    updateData.unit = parsed.data.unit || null;
  }

  if (parsed.data.approximateWeight !== undefined) {
    updateData.approximate_weight = parsed.data.approximateWeight || null;
  }

  // Always update imageUrl if it's in the parsed data (even if null, to allow deletion)
  if (parsed.data.imageUrl !== undefined) {
    updateData.image_url = parsed.data.imageUrl;
  }

  if (parsed.data.visibleTo !== undefined) {
    updateData.visible_to = parsed.data.visibleTo.length > 0 ? parsed.data.visibleTo : null;
  }

  if (parsed.data.active !== undefined) {
    updateData.active = parsed.data.active;
  }

  // Only update if there are changes
  if (Object.keys(updateData).length === 0) {
    return { status: "success" };
  }

  const { error: updateError } = await supabase
    .from("products")
    .update(updateData)
    .eq("id", parsed.data.productId);

  if (updateError) {
    console.error("Error updating product:", updateError);
    return { status: "error", code: "update-error" };
  }

  revalidatePath(`/${locale}/employee/products/${parsed.data.productId}`);
  revalidatePath(`/${locale}/employee/products`);

  return { status: "success" };
}

export type DeleteProductResult =
  | { status: "success" }
  | {
      status: "error";
      code: "not-found" | "has-orders" | "delete-error" | "unauthorized";
    };

export async function deleteProductAction(
  locale: Locale,
  productId: string,
): Promise<DeleteProductResult> {
  try {
    await requirePermission(locale, "manage_products");
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return { status: "error", code: "unauthorized" };
    }
    throw error;
  }

  const supabase = await createClient();

  // Verify product exists
  const { data: existingProduct, error: fetchError } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .single();

  if (fetchError || !existingProduct) {
    return { status: "error", code: "not-found" };
  }

  // Check if product is used in any order_items
  const { data: orderItems, error: orderItemsError } = await supabase
    .from("order_items")
    .select("id")
    .eq("product_id", productId)
    .limit(1);

  if (orderItemsError) {
    console.error("Error checking order items:", orderItemsError);
    return { status: "error", code: "delete-error" };
  }

  if (orderItems && orderItems.length > 0) {
    return { status: "error", code: "has-orders" };
  }

  // Delete product
  const { error: deleteError } = await supabase
    .from("products")
    .delete()
    .eq("id", productId);

  if (deleteError) {
    console.error("Error deleting product:", deleteError);
    return { status: "error", code: "delete-error" };
  }

  // Revalidate both list and detail pages
  revalidatePath(`/${locale}/employee/products`);
  revalidatePath(`/${locale}/employee/products/${productId}`);

  return { status: "success" };
}

