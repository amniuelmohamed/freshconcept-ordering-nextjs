import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { autoConfirmOrdersPastDeadline } from "@/lib/utils/order-auto-confirm";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type ClientRow = Database["public"]["Tables"]["clients"]["Row"];

export type OrderWithClient = OrderRow & {
  clients: Pick<ClientRow, "id" | "company_name" | "contact_name" | "contact_email"> | null;
};

type GetOrdersOptions = {
  status?: string;
  clientId?: string;
  clientSearch?: string; // Search by client name/email
  orderId?: string; // Search by order ID (partial match)
  dateFrom?: string; // YYYY-MM-DD (delivery date)
  dateTo?: string; // YYYY-MM-DD (delivery date)
  createdFrom?: string; // YYYY-MM-DD (created date)
  createdTo?: string; // YYYY-MM-DD (created date)
  limit?: number;
  offset?: number;
};

/**
 * Fetches orders with client information for employee dashboard.
 * Supports filtering by status, client, and date range.
 */
export const getOrders = cache(
  async (options: GetOrdersOptions = {}): Promise<OrderWithClient[]> => {
    // Auto-confirm orders past deadline before fetching
    await autoConfirmOrdersPastDeadline();
    
    const supabase = await createClient();
    const { 
      status, 
      clientId, 
      clientSearch,
      orderId,
      dateFrom, 
      dateTo,
      createdFrom,
      createdTo,
      limit = 50, 
      offset = 0 
    } = options;

    let query = supabase
      .from("orders")
      .select(
        `
        *,
        clients:clients(
          id,
          company_name,
          contact_name,
          contact_email
        )
      `,
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq("status", status);
    }

    if (clientId) {
      query = query.eq("client_id", clientId);
    }

    if (orderId) {
      query = query.ilike("id", `%${orderId}%`);
    }

    if (dateFrom) {
      query = query.gte("delivery_date", dateFrom);
    }

    if (dateTo) {
      query = query.lte("delivery_date", dateTo);
    }

    if (createdFrom) {
      query = query.gte("created_at", createdFrom);
    }

    if (createdTo) {
      query = query.lte("created_at", `${createdTo}T23:59:59`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching orders:", error);
      return [];
    }

    let orders = (data as OrderWithClient[]) ?? [];

    // Filter by client search (client-side filtering since we need to search in joined data)
    if (clientSearch) {
      const searchLower = clientSearch.toLowerCase();
      orders = orders.filter((order) => {
        const companyName = (order.clients?.company_name ?? "").toLowerCase();
        const contactName = (order.clients?.contact_name ?? "").toLowerCase();
        const email = (order.clients?.contact_email ?? "").toLowerCase();
        return (
          companyName.includes(searchLower) ||
          contactName.includes(searchLower) ||
          email.includes(searchLower)
        );
      });
    }

    return orders;
  },
);

/**
 * Fetches a single order with client and items information.
 */
export const getOrderById = cache(async (orderId: string) => {
  // Auto-confirm orders past deadline before fetching
  await autoConfirmOrdersPastDeadline();
  
  const supabase = await createClient();

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      `
      *,
      clients:clients(*)
    `,
    )
    .eq("id", orderId)
    .single<OrderWithClient>();

  if (orderError || !order) {
    return null;
  }

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select(
      `
      *,
      products:products(
        id,
        sku,
        unit,
        approximate_weight
      )
    `,
    )
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  if (itemsError) {
    console.error("Error fetching order items:", itemsError);
  }

  return {
    ...order,
    items: items ?? [],
  };
});

/**
 * Get the client's current pending order (if any)
 */
export const getClientPendingOrder = cache(async (clientId: string) => {
  const supabase = await createClient();

  const { data: order, error } = await supabase
    .from("orders")
    .select(
      `
      *,
      order_items(
        id,
        product_id,
        product_name,
        quantity,
        unit_price,
        subtotal,
        products(id, sku, unit, approximate_weight)
      )
    `
    )
    .eq("client_id", clientId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error fetching pending order:", error);
    return null;
  }

  return order;
});

