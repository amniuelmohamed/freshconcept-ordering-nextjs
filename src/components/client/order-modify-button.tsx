"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { useCartStore } from "@/lib/store/cart";
import { Button } from "@/components/ui/button";

type OrderItemForCart = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  sku: string;
  unit: string;
  approximateWeight: number | null;
  subtotal: number;
};

type ClientOrderModifyButtonProps = {
  locale: string;
  orderId: string;
  items: OrderItemForCart[];
};

export function ClientOrderModifyButton({
  locale,
  orderId,
  items,
}: ClientOrderModifyButtonProps) {
  const t = useTranslations("clientOrders.detail");
  const router = useRouter();
  const loadFromOrder = useCartStore((state) => state.loadFromOrder);
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(() => {
      loadFromOrder(items, orderId);
      router.push(`/${locale}/checkout`);
    });
  };

  return (
    <Button 
      variant="secondary" 
      size="sm" 
      onClick={handleClick} 
      disabled={isPending}
      className="w-full sm:w-auto"
    >
      {t("modify")}
    </Button>
  );
}


