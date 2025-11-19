'use client';

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type CartItem = {
  productId: string;
  name: string;
  sku: string;
  unit: string;
  approximateWeight: number | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

type SetQuantityPayload = {
  productId: string;
  name: string;
  sku: string;
  unit: string;
  approximateWeight: number | null;
  quantity: number;
  unitPrice: number;
};

type CartState = {
  items: Record<string, CartItem>;
  existingOrderId: string | null;
  setQuantity: (payload: SetQuantityPayload) => void;
  loadFromOrder: (items: CartItem[], orderId?: string) => void;
  clear: () => void;
};

const STORAGE_KEY = "freshconcept.cart.v3";

function calculateSubtotal(
  quantity: number,
  unitPrice: number,
  approximateWeight: number | null,
  unit: string,
) {
  // If product is sold by kg, quantity is already in kg
  // If product is sold by piece and has approximateWeight, convert pieces to kg
  if (unit.toLowerCase() === "kg" || !approximateWeight) {
    // Sold by weight directly: quantity (in kg) × price per kg
    return Number((quantity * unitPrice).toFixed(2));
  }

  // Sold by piece with approximate weight: quantity (pieces) × approximateWeight (kg per piece) × price per kg
  return Number((quantity * approximateWeight * unitPrice).toFixed(2));
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: {},
      existingOrderId: null,
      setQuantity(payload) {
        const {
          productId,
          quantity,
          unitPrice,
          name,
          sku,
          unit,
          approximateWeight,
        } = payload;
        set((state) => {
          if (quantity <= 0) {
            const nextItems = { ...state.items };
            delete nextItems[productId];
            return { items: nextItems };
          }

          const subtotal = calculateSubtotal(
            quantity,
            unitPrice,
            approximateWeight,
            unit,
          );

          return {
            items: {
              ...state.items,
              [productId]: {
                productId,
                name,
                sku,
                unit,
                approximateWeight,
                quantity,
                unitPrice,
                subtotal,
              },
            },
          };
        });
      },
      loadFromOrder(items, orderId) {
        set(() => {
          const mapped = Object.fromEntries(
            items.map((item) => [
              item.productId,
              {
                ...item,
                approximateWeight: item.approximateWeight ?? null,
                subtotal: calculateSubtotal(
                  item.quantity,
                  item.unitPrice,
                  item.approximateWeight ?? null,
                  item.unit,
                ),
              },
            ]),
          );

          return { items: mapped, existingOrderId: orderId ?? null };
        });
      },
      clear() {
        set({ items: {}, existingOrderId: null });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      version: 3,
      migrate: (persistedState: unknown, version) => {
        if (persistedState && typeof persistedState === "object") {
          const state = persistedState as {
            items?: Record<
              string,
              Partial<CartItem> & {
                productId?: string;
                quantity?: number;
                unitPrice?: number;
                subtotal?: number;
                approximateWeight?: number | null;
              }
            >;
          };

          if (!state.items) {
            return persistedState as CartState;
          }

          const migrateEntry = (
            item: Partial<CartItem> & {
              productId?: string;
              quantity?: number;
              unitPrice?: number;
              subtotal?: number;
              approximateWeight?: number | null;
            },
          ): CartItem => {
            const approximateWeight = item.approximateWeight ?? null;
            const quantity = item.quantity ?? 0;
            const unitPrice = item.unitPrice ?? 0;

            return {
              productId: item.productId ?? "",
              name: item.name ?? "",
              sku: item.sku ?? "",
              unit: item.unit ?? "",
              approximateWeight,
              quantity,
              unitPrice,
              subtotal: calculateSubtotal(
                quantity,
                unitPrice,
                approximateWeight,
                item.unit ?? "",
              ),
            };
          };

          if (version < 2) {
            const migratedItems = Object.fromEntries(
              Object.entries(state.items).map(([key, value]) => [
                key,
                migrateEntry({
                  ...value,
                  productId: value.productId ?? key,
                }),
              ]),
            );

            return {
              items: migratedItems,
            } satisfies Partial<CartState>;
          }

          if (version === 2) {
            const migratedItems = Object.fromEntries(
              Object.entries(state.items).map(([key, value]) => [
                key,
                migrateEntry({
                  ...value,
                  productId: value.productId ?? key,
                }),
              ]),
            );

            return {
              items: migratedItems,
            } satisfies Partial<CartState>;
          }

          const migratedItems = Object.fromEntries(
            Object.entries(state.items).map(([key, item]) => [
              key,
              migrateEntry({
                ...item,
                productId: item.productId ?? key,
              }),
            ]),
          );

          return {
            items: migratedItems,
          } satisfies Partial<CartState>;
        }

        return persistedState as Partial<CartState>;
      },
    },
  ),
);

