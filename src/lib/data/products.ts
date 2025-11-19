import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];

export type ProductWithCategory = ProductRow & {
  category: Pick<CategoryRow, "id" | "name"> | null;
};

/**
 * Fetches all products with their categories.
 */
export const getProducts = cache(async (): Promise<ProductWithCategory[]> => {
  const supabase = await createClient();

  const { data: products, error } = await supabase
    .from("products")
    .select(`
      *,
      category:categories(id, name)
    `)
    .order("created_at", { ascending: false });

  if (error || !products) {
    console.error("Error fetching products:", error);
    return [];
  }

  return products;
});

/**
 * Fetches a single product by ID with its category.
 */
export const getProductById = cache(async (productId: string) => {
  const supabase = await createClient();

  const { data: product, error } = await supabase
    .from("products")
    .select(`
      *,
      category:categories(id, name)
    `)
    .eq("id", productId)
    .single<ProductWithCategory>();

  if (error || !product) {
    if (error?.code !== "PGRST116") {
      console.error("Error fetching product:", {
        error,
        message: error?.message,
        details: error?.details,
      });
    }
    return null;
  }

  return product;
});

/**
 * Fetches products by category ID.
 */
export const getProductsByCategory = cache(async (categoryId: string): Promise<ProductWithCategory[]> => {
  const supabase = await createClient();

  const { data: products, error } = await supabase
    .from("products")
    .select(`
      *,
      category:categories(id, name)
    `)
    .eq("category_id", categoryId)
    .order("created_at", { ascending: false });

  if (error || !products) {
    console.error("Error fetching products by category:", error);
    return [];
  }

  return products;
});

