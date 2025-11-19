"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { cancelOrderAction } from "@/app/[locale]/(client)/orders/[id]/actions";
import { useCartStore } from "@/lib/store/cart";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ClientOrderCancelButtonProps = {
  locale: string;
  orderId: string;
};

export function ClientOrderCancelButton({
  locale,
  orderId,
}: ClientOrderCancelButtonProps) {
  const t = useTranslations("clientOrders.detail");
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const clearCart = useCartStore((state) => state.clear);
  const existingOrderId = useCartStore((state) => state.existingOrderId);

  const handleCancel = () => {
    startTransition(async () => {
      const result = await cancelOrderAction(orderId);

      if (result.success) {
        // Clear the cart if this is the order currently loaded in the cart
        if (existingOrderId === orderId) {
          clearCart();
        }
        toast.success(t("cancelSuccess"));
        router.push(`/${locale}/orders`);
      } else {
        toast.error(t("cancelError"));
      }
      setShowConfirm(false);
    });
  };

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setShowConfirm(true)}
      >
        {t("cancel")}
      </Button>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("cancelConfirm.title")}</DialogTitle>
            <DialogDescription>
              {t("cancelConfirm.description")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirm(false)}
              disabled={isPending}
            >
              {t("cancelConfirm.back")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={isPending}
            >
              {isPending ? "..." : t("cancelConfirm.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

