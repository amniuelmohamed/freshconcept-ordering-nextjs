"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import type { Locale } from "@/i18n/routing";
import type { TablesUpdate } from "@/types/database";

const updateOrderSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(["pending", "confirmed", "shipped", "delivered", "cancelled"]).optional(),
  finalTotal: z.number().nonnegative().optional(),
  notes: z.string().max(500).optional(),
});

export type UpdateOrderResult =
  | { status: "success" }
  | { status: "error"; code: "validation-error" | "not-found" | "update-error" | "unauthorized" };

export async function updateOrderAction(
  locale: Locale,
  formData: FormData,
): Promise<UpdateOrderResult> {
  // Use getSession() to avoid duplicate auth check (layout already verified)
  const session = await getSession();
  if (!session?.employeeProfile) {
    return { status: "error", code: "unauthorized" };
  }

  const parsed = updateOrderSchema.safeParse({
    orderId: formData.get("orderId"),
    status: formData.get("status") || undefined,
    finalTotal: formData.get("finalTotal")
      ? Number(formData.get("finalTotal"))
      : undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { status: "error", code: "validation-error" };
  }

  const supabase = await createClient();

  // Verify order exists
  const { data: existingOrder, error: fetchError } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", parsed.data.orderId)
    .single();

  if (fetchError || !existingOrder) {
    return { status: "error", code: "not-found" };
  }

  // Build update object
  const updateData: TablesUpdate<"orders"> = {};

  if (parsed.data.status !== undefined) {
    updateData.status = parsed.data.status;
  }

  if (parsed.data.finalTotal !== undefined) {
    updateData.final_total = parsed.data.finalTotal;
  }

  if (parsed.data.notes !== undefined) {
    updateData.notes = parsed.data.notes;
  }

  // Only update if there are changes
  if (Object.keys(updateData).length === 0) {
    return { status: "success" };
  }

  const { error: updateError } = await supabase
    .from("orders")
    .update(updateData)
    .eq("id", parsed.data.orderId);

  if (updateError) {
    console.error("Error updating order:", updateError);
    return { status: "error", code: "update-error" };
  }

  revalidatePath(`/${locale}/employee/orders/${parsed.data.orderId}`);
  revalidatePath(`/${locale}/employee/orders`);

  return { status: "success" };
}

