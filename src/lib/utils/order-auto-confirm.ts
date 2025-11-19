import { createClient } from "@/lib/supabase/server";
import { getCutoffSettings } from "@/lib/data/settings";
import { addDays, set, isAfter } from "date-fns";

/**
 * Auto-confirms pending orders that have passed their deadline.
 * Deadline is calculated as: delivery_date - cutoffDayOffset days at cutoffTime
 * 
 * This should be called when fetching orders to ensure orders are auto-confirmed.
 */
export async function autoConfirmOrdersPastDeadline(): Promise<number> {
  const supabase = await createClient();
  const { cutoffTime, cutoffDayOffset } = await getCutoffSettings();
  
  // Parse cutoff time
  const [hours, minutes] = cutoffTime.split(":").map(Number);
  const now = new Date();
  
  // Get all pending orders
  const { data: pendingOrders, error } = await supabase
    .from("orders")
    .select("id, delivery_date, status")
    .eq("status", "pending");
  
  if (error || !pendingOrders) {
    console.error("Error fetching pending orders for auto-confirmation:", error);
    return 0;
  }
  
  let confirmedCount = 0;
  
  // Check each pending order
  for (const order of pendingOrders) {
    if (!order.delivery_date) continue;
    
    // Calculate deadline: delivery_date - cutoffDayOffset days at cutoffTime
    const deliveryDate = new Date(order.delivery_date);
    const deadlineDate = addDays(deliveryDate, -cutoffDayOffset);
    const deadline = set(deadlineDate, {
      hours,
      minutes,
      seconds: 0,
      milliseconds: 0,
    });
    
    // If current time is past the deadline, auto-confirm the order
    if (isAfter(now, deadline)) {
      const { error: updateError } = await supabase
        .from("orders")
        .update({ status: "confirmed" })
        .eq("id", order.id)
        .eq("status", "pending"); // Only update if still pending (race condition protection)
      
      if (!updateError) {
        confirmedCount++;
      } else {
        console.error(`Error auto-confirming order ${order.id}:`, updateError);
      }
    }
  }
  
  return confirmedCount;
}

