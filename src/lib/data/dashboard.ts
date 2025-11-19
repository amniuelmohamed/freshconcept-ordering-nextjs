import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

type DashboardStats = {
  pendingOrders: number;
  ordersToday: number;
  activeClients: number;
  pendingOrdersValue: number; // Total estimated value of pending orders
  monthOrdersCount: number; // Orders created this month
  monthOrdersValue: number; // Total estimated value of orders created this month
};

/**
 * Fetches dashboard statistics for employee dashboard.
 * Uses cache() to deduplicate requests during the same render.
 */
export const getDashboardStats = cache(async (): Promise<DashboardStats> => {
  const supabase = await createClient();

  // Get today's date and current month range for filtering
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0]; // YYYY-MM-DD

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const monthStartStr = monthStart.toISOString();
  const nextMonthStartStr = nextMonthStart.toISOString();

  // Fetch all stats in parallel
  const [
    pendingOrdersResult,
    ordersTodayResult,
    clientsResult,
    pendingValueResult,
    monthOrdersResult,
  ] = await Promise.all([
    // Count pending orders
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),

    // Count deliveries scheduled for today (based on delivery_date), excluding cancelled
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("delivery_date", todayStr)
      .neq("status", "cancelled"),

    // Count active clients (all clients in the system)
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true }),

    // Get total estimated value of pending orders
    supabase
      .from("orders")
      .select("estimated_total")
      .eq("status", "pending"),

    // Get orders created this month (for count + total value), excluding cancelled
    supabase
      .from("orders")
      .select("estimated_total, created_at")
      .gte("created_at", monthStartStr)
      .lt("created_at", nextMonthStartStr)
      .neq("status", "cancelled"),
  ]);

  // Calculate total value of pending orders
  const pendingOrdersValue =
    pendingValueResult.data?.reduce((sum, order) => {
      return sum + (Number(order.estimated_total) || 0);
    }, 0) ?? 0;

  const monthOrdersData = monthOrdersResult.data ?? [];
  const monthOrdersValue =
    monthOrdersData.reduce((sum, order) => {
      return sum + (Number(order.estimated_total) || 0);
    }, 0) ?? 0;

  return {
    pendingOrders: pendingOrdersResult.count ?? 0,
    ordersToday: ordersTodayResult.count ?? 0,
    activeClients: clientsResult.count ?? 0,
    pendingOrdersValue: Math.round(pendingOrdersValue * 100) / 100, // Round to 2 decimal places
    monthOrdersCount: monthOrdersData.length,
    monthOrdersValue: Math.round(monthOrdersValue * 100) / 100,
  };
});


