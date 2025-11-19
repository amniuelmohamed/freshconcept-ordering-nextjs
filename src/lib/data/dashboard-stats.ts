import { createClient } from "@/lib/supabase/server";
import { cache } from "react";

export interface OrdersChartData {
  date: string;
  orders: number;
  revenue: number;
}

export interface CategoryData {
  name: string;
  value: number;
}

export interface StatusData {
  status: string;
  count: number;
}

/**
 * Get orders statistics for the last 30 days (for charts)
 */
export const getOrdersChartData = cache(async (clientId?: string): Promise<OrdersChartData[]> => {
  const supabase = await createClient();
  
  // Get orders from last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  let query = supabase
    .from("orders")
    .select("created_at, estimated_total, final_total, status")
    .gte("created_at", thirtyDaysAgo.toISOString());
  
  if (clientId) {
    query = query.eq("client_id", clientId);
  }
  
  const { data: orders } = await query;
  
  if (!orders) return [];
  
  // Group by date, excluding cancelled orders
  const groupedData = orders.reduce((acc: Record<string, { orders: number; revenue: number }>, order) => {
    // Skip cancelled orders
    if (order.status === "cancelled") {
      return acc;
    }
    
    const date = new Date(order.created_at!).toLocaleDateString("fr-FR", {
      month: "short",
      day: "numeric",
    });
    
    if (!acc[date]) {
      acc[date] = { orders: 0, revenue: 0 };
    }
    
    acc[date].orders += 1;
    
    // Use final_total if available (confirmed), otherwise use estimated_total (pending)
    const orderValue = Number(order.final_total || order.estimated_total || 0);
    acc[date].revenue += orderValue;
    
    return acc;
  }, {});
  
  // Convert to array and sort by date
  return Object.entries(groupedData)
    .map(([date, data]) => ({
      date,
      orders: data.orders,
      revenue: Math.round(data.revenue * 100) / 100,
    }))
    .slice(-14); // Last 14 days
});

/**
 * Get category distribution for products ordered
 */
export const getCategoryDistribution = cache(async (clientId?: string): Promise<CategoryData[]> => {
  const supabase = await createClient();
  
  let query = supabase
    .from("order_items")
    .select(`
      product_id,
      quantity,
      orders!inner(client_id, status)
    `)
    .neq("orders.status", "cancelled");
  
  if (clientId) {
    query = query.eq("orders.client_id", clientId);
  }
  
  const { data: orderItems } = await query;
  
  if (!orderItems) return [];
  
  // Get product categories
  const productIds = [...new Set(orderItems.map((item: { product_id: string | null }) => item.product_id).filter((id): id is string => id !== null))];
  
  const { data: products } = await supabase
    .from("products")
    .select("id, category_id, categories(name)")
    .in("id", productIds);
  
  if (!products) return [];
  
  // Count orders by category
  const categoryCount: Record<string, number> = {};
  
  orderItems.forEach((item: { product_id: string | null; quantity: number | null }) => {
    if (!item.product_id) return;
    
    const product = products.find((p) => p.id === item.product_id);
    if (product && product.categories) {
      const categories = product.categories as { name?: { fr?: string } };
      const categoryName = categories.name?.fr || "Autre";
      categoryCount[categoryName] = (categoryCount[categoryName] || 0) + Number(item.quantity || 0);
    }
  });
  
  return Object.entries(categoryCount)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6); // Top 6 categories
});

/**
 * Get order status distribution
 */
export const getStatusDistribution = cache(async (clientId?: string): Promise<StatusData[]> => {
  const supabase = await createClient();
  
  let query = supabase
    .from("orders")
    .select("status");
  
  if (clientId) {
    query = query.eq("client_id", clientId);
  }
  
  const { data: orders } = await query;
  
  if (!orders) return [];
  
  // Count by status
  const statusCount: Record<string, number> = {};
  
  orders.forEach((order) => {
    const status = order.status || "unknown";
    statusCount[status] = (statusCount[status] || 0) + 1;
  });
  
  return Object.entries(statusCount)
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);
});

/**
 * Get sparkline data for KPI cards (last 7 days)
 */
export const getSparklineData = cache(async (clientId?: string): Promise<{ value: number }[]> => {
  const supabase = await createClient();
  
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  let query = supabase
    .from("orders")
    .select("created_at, estimated_total, final_total, status")
    .gte("created_at", sevenDaysAgo.toISOString());
  
  if (clientId) {
    query = query.eq("client_id", clientId);
  }
  
  const { data: orders } = await query;
  
  if (!orders) return Array(7).fill({ value: 0 });
  
  // Group by date
  const dailyData: Record<string, number> = {};
  
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dateKey = date.toISOString().split('T')[0];
    dailyData[dateKey] = 0;
  }
  
  orders.forEach((order) => {
    const dateKey = order.created_at!.split('T')[0];
    if (dailyData[dateKey] !== undefined && order.status !== "cancelled") {
      // Use final_total if available (confirmed orders), otherwise use estimated_total (pending orders)
      const orderValue = Number(order.final_total || order.estimated_total || 0);
      dailyData[dateKey] += orderValue;
    }
  });
  
  return Object.values(dailyData).map(value => ({ value }));
});

/**
 * Calculate trend percentage (compare last 7 days vs previous 7 days)
 */
export const calculateTrend = cache(async (clientId?: string): Promise<{ ordersChangePercent: number; revenueChangePercent: number }> => {
  const supabase = await createClient();
  
  const today = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(today.getDate() - 7);
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(today.getDate() - 14);
  
  // Last 7 days
  let queryLast7 = supabase
    .from("orders")
    .select("estimated_total, final_total, status")
    .gte("created_at", sevenDaysAgo.toISOString());
  
  // Previous 7 days
  let queryPrev7 = supabase
    .from("orders")
    .select("estimated_total, final_total, status")
    .gte("created_at", fourteenDaysAgo.toISOString())
    .lt("created_at", sevenDaysAgo.toISOString());
  
  if (clientId) {
    queryLast7 = queryLast7.eq("client_id", clientId);
    queryPrev7 = queryPrev7.eq("client_id", clientId);
  }
  
  const [{ data: last7Orders }, { data: prev7Orders }] = await Promise.all([
    queryLast7,
    queryPrev7,
  ]);
  
  // Count only non-cancelled orders
  const last7Count = last7Orders?.filter(order => order.status !== "cancelled").length || 0;
  const prev7Count = prev7Orders?.filter(order => order.status !== "cancelled").length || 0;
  
  const last7Revenue = last7Orders?.reduce((sum, order) => {
    if (order.status === "cancelled") return sum;
    // Use final_total if available (confirmed), otherwise use estimated_total (pending)
    const orderValue = Number(order.final_total || order.estimated_total || 0);
    return sum + orderValue;
  }, 0) || 0;
  
  const prev7Revenue = prev7Orders?.reduce((sum, order) => {
    if (order.status === "cancelled") return sum;
    // Use final_total if available (confirmed), otherwise use estimated_total (pending)
    const orderValue = Number(order.final_total || order.estimated_total || 0);
    return sum + orderValue;
  }, 0) || 0;
  
  const ordersChangePercent = prev7Count > 0 
    ? Math.round(((last7Count - prev7Count) / prev7Count) * 100)
    : last7Count > 0 ? 100 : 0;
  
  const revenueChangePercent = prev7Revenue > 0
    ? Math.round(((last7Revenue - prev7Revenue) / prev7Revenue) * 100)
    : last7Revenue > 0 ? 100 : 0;
  
  return { ordersChangePercent, revenueChangePercent };
});
