"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  deleteProductAction,
  type DeleteProductResult,
} from "@/app/[locale]/(employee)/employee/products/actions";
import type { Locale } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type DeleteProductButtonProps = {
  locale: Locale;
  productId: string;
  productName: string;
  orderItemCount: number;
};

export function DeleteProductButton({
  locale,
  productId,
  productName,
  orderItemCount,
}: DeleteProductButtonProps) {
  const t = useTranslations("employeeProducts.delete");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<DeleteProductResult | null>(null);
  const [open, setOpen] = useState(false);

  const handleDelete = () => {
    setResult(null);
    startTransition(async () => {
      const actionResult = await deleteProductAction(locale, productId);
      setResult(actionResult);

      if (actionResult.status === "success") {
        toast.success(t("successMessage"));
        setOpen(false);
        // Use replace instead of push to avoid back button issues
        router.replace(`/${locale}/employee/products`);
        router.refresh();
      } else if (actionResult.status === "error") {
        if (actionResult.code === "has-orders") {
          toast.error(t("cannotDelete", { count: orderItemCount }));
          setOpen(false);
        } else {
          toast.error(t("errorMessage"));
        }
      }
    });
  };

  if (orderItemCount > 0 || (result?.status === "error" && result.code === "has-orders")) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {orderItemCount === 1
            ? t("cannotDelete", { count: 1 })
            : t("cannotDelete", { count: orderItemCount })}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="destructive">
          {t("button")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("confirmMessage", { name: productName })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setOpen(false);
              setResult(null);
            }}
            disabled={isPending}
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? t("deleting") : t("confirmDelete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
