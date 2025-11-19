import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/routing";
import { getLocalizedField } from "@/lib/utils/i18n";
import { calculateDiscountedPrice } from "@/lib/utils/pricing";
import { getSession } from "@/lib/auth/session";
import type { Database } from "@/types/database";

export type QuickOrderCategory = {
  id: string;
  name: string;
};

export type QuickOrderProduct = {
  id: string;
  sku: string;
  name: string;
  description?: string;
  unit: string;
  categoryId: string;
  categoryName: string;
  price: number;
  basePrice: number;
  approximateWeight: number | null;
  imageUrl: string | null;
  isFavorite: boolean;
};

export type QuickOrderData = {
  categories: QuickOrderCategory[];
  products: QuickOrderProduct[];
  discount: number;
};

type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type FavoriteRow = Database["public"]["Tables"]["favorites"]["Row"];

type ProductWithCategory = ProductRow & {
  category: Pick<CategoryRow, "id" | "name"> | null;
};

export async function getQuickOrderData(
  locale: Locale,
): Promise<QuickOrderData> {
  // Use getSession() instead of requireClient() - assumes auth already verified
  // This function is typically called from pages where layout already checked auth
  const session = await getSession();
  
  if (!session?.clientProfile) {
    throw new Error("Client session required");
  }
  
  const supabase = await createClient();

  const discount = session.clientProfile?.remise ?? 0;

  const [categoriesResult, productsResult, favoritesResult] =
    await Promise.all([
      supabase
        .from("categories")
        .select("id, name")
        .order("name")
        .returns<Array<Pick<CategoryRow, "id" | "name">>>(),
      supabase
        .from("products")
        .select(
          `
            id,
            sku,
            name,
            description,
            unit,
            category_id,
            base_price,
            approximate_weight,
            image_url,
            category:categories(id, name)
          `,
        )
        .returns<ProductWithCategory[]>(),
      supabase
        .from("favorites")
        .select("product_id")
        .returns<Array<Pick<FavoriteRow, "product_id">>>(),
    ]);

  if (categoriesResult.error) {
    throw categoriesResult.error;
  }

  if (productsResult.error) {
    throw productsResult.error;
  }

  if (favoritesResult.error) {
    throw favoritesResult.error;
  }

  const favoritesSet = new Set(
    favoritesResult.data?.map((favorite) => favorite.product_id) ?? [],
  );

  const categories: QuickOrderCategory[] =
    categoriesResult.data?.map((category) => ({
      id: category.id,
      name: getLocalizedField(category.name as { fr?: string; nl?: string; en?: string } | null, locale),
    })) ?? [];

  const products: QuickOrderProduct[] =
    productsResult.data?.map((product) => {
      const categoryId = product.category?.id ?? product.category_id ?? "";
      const categoryName =
        product.category?.name &&
        getLocalizedField(product.category.name as { fr?: string; nl?: string; en?: string } | null, locale);

      const basePrice =
        typeof product.base_price === "number"
          ? product.base_price
          : Number(product.base_price ?? 0);

      return {
        id: product.id,
        sku: product.sku ?? "",
        name: getLocalizedField(product.name as { fr?: string; nl?: string; en?: string } | null, locale),
        description: getLocalizedField(product.description as { fr?: string; nl?: string; en?: string } | null, locale) || undefined,
        unit: product.unit ?? "",
        categoryId,
        categoryName: categoryName || "",
        price: calculateDiscountedPrice(basePrice, discount),
        basePrice,
        approximateWeight:
          typeof product.approximate_weight === "number"
            ? product.approximate_weight
            : product.approximate_weight === null
            ? null
            : Number(product.approximate_weight ?? 0),
        imageUrl: product.image_url,
        isFavorite: favoritesSet.has(product.id),
      };
    }) ?? [];

  return {
    categories,
    products,
    discount,
  };
}

