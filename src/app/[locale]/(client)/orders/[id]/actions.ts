"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type CancelOrderResult =
  | { success: true }
  | { success: false; error: "unauthorized" | "not-found" | "invalid-status" | "unknown" };

export async function cancelOrderAction(orderId: string): Promise<CancelOrderResult> {
  try {
    const session = await getSession();
    
    if (!session?.clientProfile) {
      return { success: false, error: "unauthorized" };
    }

    const supabase = await createClient();

    // First, verify the order exists and belongs to the current client
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("id, client_id, status")
      .eq("id", orderId)
      .maybeSingle();

    if (fetchError || !order) {
      return { success: false, error: "not-found" };
    }

    // Verify ownership
    if (order.client_id !== session.clientProfile.id) {
      return { success: false, error: "unauthorized" };
    }

    // Only allow cancellation of pending orders
    if (order.status !== "pending") {
      return { success: false, error: "invalid-status" };
    }

    // Update the order status to cancelled
    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", orderId);

    if (updateError) {
      console.error("Error cancelling order:", updateError);
      return { success: false, error: "unknown" };
    }

    // Revalidate the orders pages
    revalidatePath(`/[locale]/(client)/orders`, "page");
    revalidatePath(`/[locale]/(client)/orders/[id]`, "page");

    return { success: true };
  } catch (error) {
    console.error("Unexpected error cancelling order:", error);
    return { success: false, error: "unknown" };
  }
}

