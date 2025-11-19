import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Get client dashboard statistics
 */
export const getClientDashboardStats = cache(async (clientId: string) => {
  const supabase = await createClient();

  // Get pending order
  const { data: pendingOrder } = await supabase
    .from("orders")
    .select("id, estimated_total")
    .eq("client_id", clientId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Get favorites count
  const { count: favoritesCount } = await supabase
    .from("favorites")
    .select("*", { count: "exact", head: true })
    .eq("client_id", clientId);

  // Get orders count for this month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const { count: monthOrdersCount } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("client_id", clientId)
    .neq("status", "cancelled")
    .gte("created_at", startOfMonth.toISOString())
    .lte("created_at", endOfMonth.toISOString());

  return {
    pendingOrder: pendingOrder || null,
    favoritesCount: favoritesCount || 0,
    monthOrdersCount: monthOrdersCount || 0,
  };
});

/**
 * Get client recent orders (last 5)
 */
export const getClientRecentOrders = cache(async (clientId: string) => {
  const supabase = await createClient();

  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, created_at, delivery_date, status, estimated_total")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error("Error fetching recent orders:", error);
    return [];
  }

  return orders || [];
});

/**
 * Get client favorite products (top 8)
 */
export const getClientFavoriteProducts = cache(async (clientId: string) => {
  const supabase = await createClient();

  const { data: favorites, error } = await supabase
    .from("favorites")
    .select(
      `
      product_id,
      products (
        id,
        sku,
        name,
        base_price,
        unit,
        image_url,
        approximate_weight
      )
    `
    )
    .eq("client_id", clientId)
    .limit(8);

  if (error) {
    console.error("Error fetching favorite products:", error);
    return [];
  }

  return (
    favorites?.map((fav) => ({
      id: fav.products?.id || "",
      sku: fav.products?.sku || "",
      name: fav.products?.name || {},
      price: fav.products?.base_price || 0,
      unit: fav.products?.unit || "",
      imageUrl: fav.products?.image_url || null,
      approximateWeight: fav.products?.approximate_weight || null,
    })) || []
  );
});

