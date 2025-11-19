"use client";

import { useEffect, useRef } from "react";
import { useCartStore } from "@/lib/store/cart";

type PendingOrderItem = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  sku: string;
  unit: string;
  approximateWeight: number | null;
  subtotal: number;
};

type QuickOrderPendingLoaderProps = {
  pendingOrderId: string | null;
  pendingOrderItems: PendingOrderItem[];
};

/**
 * Client component that automatically loads a pending order into the cart
 * if one exists and the cart is empty (for quick-order page).
 */
export function QuickOrderPendingLoader({
  pendingOrderId,
  pendingOrderItems,
}: QuickOrderPendingLoaderProps) {
  const loadFromOrder = useCartStore((state) => state.loadFromOrder);
  const existingOrderId = useCartStore((state) => state.existingOrderId);
  const cartItemsCount = useCartStore((state) => Object.keys(state.items).length);
  
  // Track if we've already loaded this order to prevent infinite loops
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    // Only auto-load if:
    // 1. There's a pending order from the server
    // 2. The cart is currently empty
    // 3. The cart doesn't already have this order loaded
    // 4. We haven't already loaded it in this render cycle
    if (
      pendingOrderId &&
      pendingOrderItems.length > 0 &&
      cartItemsCount === 0 &&
      existingOrderId !== pendingOrderId &&
      !hasLoadedRef.current
    ) {
      hasLoadedRef.current = true;
      loadFromOrder(pendingOrderItems, pendingOrderId);
    }
  }, [pendingOrderId, existingOrderId, cartItemsCount, pendingOrderItems, loadFromOrder]);

  return null;
}

