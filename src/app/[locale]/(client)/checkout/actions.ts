"use server";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import type { TablesInsert } from "@/types/database";

const orderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  name: z.string().min(1),
  sku: z.string().min(1),
  unit: z.string().min(1),
});

const orderPayloadSchema = z.object({
  locale: z.string().min(1),
  items: z.array(orderItemSchema).min(1),
  notes: z.string().max(500).optional(),
  deliveryDate: z
    .string()
    .refine((value) => !value || !Number.isNaN(Date.parse(value)), {
      message: "Invalid delivery date.",
    })
    .optional(),
});

export type SubmitOrderResult =
  | { status: "success"; orderId: string }
  | {
      status: "error";
      code:
        | "cart-empty"
        | "validation-error"
        | "product-mismatch"
        | "order-error"
        | "items-error"
        | "unauthorized"
        | "unknown";
    };

export type SubmitOrderState = SubmitOrderResult | { status: "idle" };

type OrderInsert = TablesInsert<"orders">;
type OrderRow = TablesInsert<"orders"> & { id: string };
type OrderItemInsert = TablesInsert<"order_items">;

export async function submitOrderAction(
  _prevState: SubmitOrderState,
  formData: FormData,
): Promise<SubmitOrderState> {
  const existingOrderIdRaw = formData.get("existingOrderId");
  const existingOrderId = existingOrderIdRaw
    ? String(existingOrderIdRaw)
    : null;

  let items: unknown;
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return { status: "error", code: "validation-error" };
  }

  const parsed = orderPayloadSchema.safeParse({
    locale: formData.get("locale"),
    items,
    notes: formData.get("notes"),
    deliveryDate: formData.get("deliveryDate"),
  });

  if (!parsed.success) {
    if (parsed.error.issues.some((issue) => issue.path[0] === "items")) {
      return { status: "error", code: "cart-empty" };
    }
    return { status: "error", code: "validation-error" };
  }

  // Use getSession() instead of requireClient() to avoid duplicate auth check
  // Actions are typically called from pages where layout already verified auth
  const session = await getSession();
  
  if (!session?.clientProfile) {
    return { status: "error", code: "unauthorized" };
  }
  
  const supabase = await createClient();

  // Validate that all products exist
  const productIds = Array.from(
    new Set(parsed.data.items.map((item) => item.productId)),
  );

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id")
    .in("id", productIds);

  if (productsError || !products || products.length !== productIds.length) {
    return { status: "error", code: "product-mismatch" };
  }

  // Decide whether we're creating a new order or updating an existing one
  let orderIdToUse: string | null = null;

  if (existingOrderId) {
    // Verify that the existing order belongs to this client and is still pending
    const { data: existingOrder, error: existingOrderError } = await supabase
      .from("orders")
      .select("id, client_id, status")
      .eq("id", existingOrderId)
      .maybeSingle<{
        id: string;
        client_id: string | null;
        status: string | null;
      }>();

    if (
      existingOrderError ||
      !existingOrder ||
      existingOrder.client_id !== session.clientProfile.id ||
      existingOrder.status !== "pending"
    ) {
      // If the order doesn't belong to the client or is no longer pending,
      // refuse to modify it.
      return { status: "error", code: "unauthorized" };
    }

    orderIdToUse = existingOrder.id;

    // Update base order fields (delivery_date, notes, updated_at)
    const { error: updateOrderError } = await supabase
      .from("orders")
      .update({
        delivery_date: parsed.data.deliveryDate ?? null,
        notes: parsed.data.notes ?? null,
        status: "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderIdToUse);

    if (updateOrderError) {
      console.error("Error updating existing order:", updateOrderError);
      return { status: "error", code: "order-error" };
    }

    // Remove existing items so we can replace them with the new cart state
    const { error: deleteItemsError } = await supabase
      .from("order_items")
      .delete()
      .eq("order_id", orderIdToUse);

    if (deleteItemsError) {
      console.error("Error deleting existing order items:", deleteItemsError);
      return { status: "error", code: "items-error" };
    }
  } else {
    // Insert new order - triggers will calculate estimated_total after items are added
    const orderInput = {
      client_id: session.clientProfile.id,
      status: "pending",
      delivery_date: parsed.data.deliveryDate ?? null,
      notes: parsed.data.notes ?? null,
      // estimated_total will be calculated by trigger after order_items are inserted
      estimated_total: null,
    } satisfies OrderInsert;

    const { data: orderInsert, error: orderError } = await supabase
      .from("orders")
      .insert(orderInput)
      .select("id")
      .single<OrderRow>();

    if (orderError || !orderInsert) {
      return { status: "error", code: "order-error" };
    }

    orderIdToUse = orderInsert.id;
  }

  // Insert order items - triggers will automatically:
  // 1. Snapshot product_name (in client's locale)
  // 2. Calculate and snapshot unit_price (with discount applied)
  // 3. Calculate subtotal (using unit and approximate_weight)
  // 4. Update order.estimated_total
  const orderItemsInput: OrderItemInsert[] = parsed.data.items.map((item) => ({
    order_id: orderIdToUse as string,
    product_id: item.productId,
    quantity: item.quantity,
    // All other fields (product_name, unit_price, subtotal, unit, approximate_weight)
    // are automatically filled by triggers
  }));

  const { data: insertedItems, error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItemsInput)
    .select();

  if (itemsError) {
    console.error("Order items insert error:", itemsError);
    console.error("Attempted to insert:", JSON.stringify(orderItemsInput, null, 2));
    return { status: "error", code: "items-error" };
  }

  if (!insertedItems || insertedItems.length === 0) {
    console.error("No items were inserted");
    return { status: "error", code: "items-error" };
  }

  return { status: "success", orderId: orderIdToUse as string };
}

