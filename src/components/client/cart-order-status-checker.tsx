"use client";

import { useEffect } from "react";
import { useCartStore } from "@/lib/store/cart";

type CartOrderStatusCheckerProps = {
  currentPendingOrderId: string | null;
};

/**
 * Client component that checks if the order in the cart is still valid (pending).
 * If the order in the cart is no longer pending, it clears the cart.
 */
export function CartOrderStatusChecker({
  currentPendingOrderId,
}: CartOrderStatusCheckerProps) {
  const existingOrderId = useCartStore((state) => state.existingOrderId);
  const clearCart = useCartStore((state) => state.clear);

  useEffect(() => {
    // If there's an order loaded in the cart but it's no longer the pending order,
    // it means the order status has changed (e.g., confirmed by employee)
    // In this case, clear the cart so the client can start fresh
    if (existingOrderId && existingOrderId !== currentPendingOrderId) {
      clearCart();
    }
  }, [existingOrderId, currentPendingOrderId, clearCart]);

  return null;
}

