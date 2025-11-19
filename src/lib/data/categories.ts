import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];

export type CategoryWithProductCount = CategoryRow & {
  productCount: number;
};

/**
 * Fetches all categories with the count of products in each category.
 */
export const getCategories = cache(async (): Promise<CategoryWithProductCount[]> => {
  const supabase = await createClient();

  const { data: categories, error: categoriesError } = await supabase
    .from("categories")
    .select("*")
    .order("created_at", { ascending: false });

  if (categoriesError || !categories) {
    console.error("Error fetching categories:", categoriesError);
    return [];
  }

  // Get product counts for each category
  const categoryIds = categories.map((category) => category.id);
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("category_id")
    .in("category_id", categoryIds);

  if (productsError) {
    console.error("Error fetching product counts:", productsError);
  }

  // Count products per category
  const productCounts = new Map<string, number>();
  products?.forEach((product) => {
    if (product.category_id) {
      productCounts.set(
        product.category_id,
        (productCounts.get(product.category_id) ?? 0) + 1,
      );
    }
  });

  return categories.map((category) => ({
    ...category,
    productCount: productCounts.get(category.id) ?? 0,
  }));
});

/**
 * Fetches a single category by ID.
 */
export const getCategoryById = cache(async (categoryId: string) => {
  const supabase = await createClient();

  const { data: category, error } = await supabase
    .from("categories")
    .select("*")
    .eq("id", categoryId)
    .single<CategoryRow>();

  if (error || !category) {
    if (error?.code !== "PGRST116") {
      console.error("Error fetching category:", {
        error,
        message: error?.message,
        details: error?.details,
      });
    }
    return null;
  }

  return category;
});

/**
 * Fetches all categories (simple list, no counts) for dropdowns.
 */
export const getCategoriesList = cache(async (): Promise<CategoryRow[]> => {
  const supabase = await createClient();

  const { data: categories, error } = await supabase
    .from("categories")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !categories) {
    console.error("Error fetching categories list:", error);
    return [];
  }

  return categories;
});

