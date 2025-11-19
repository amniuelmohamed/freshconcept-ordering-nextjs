"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { deleteCategoryAction, type DeleteCategoryResult } from "@/app/[locale]/(employee)/employee/categories/actions";
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

type DeleteCategoryButtonProps = {
  locale: Locale;
  categoryId: string;
  categoryName: string;
  productCount: number;
};

export function DeleteCategoryButton({
  locale,
  categoryId,
  categoryName,
  productCount,
}: DeleteCategoryButtonProps) {
  const t = useTranslations("categories.delete");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [, setResult] = useState<DeleteCategoryResult | null>(null);
  const [open, setOpen] = useState(false);

  const handleDelete = () => {
    setResult(null);
    startTransition(async () => {
      const actionResult = await deleteCategoryAction(locale, categoryId);
      setResult(actionResult);

      if (actionResult.status === "success") {
        toast.success(t("successMessage"));
        setOpen(false);
        router.replace(`/${locale}/employee/categories`);
        router.refresh();
      } else if (actionResult.status === "error") {
        toast.error(t(`errors.${actionResult.code}`));
        setOpen(false);
      }
    });
  };

  if (productCount > 0) {
    return (
      <Alert>
        <AlertDescription>
          {productCount === 1
            ? t("cannotDeleteOne", { count: productCount })
            : t("cannotDeleteMany", { count: productCount })}
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
            {t("confirmMessage", { name: categoryName })}
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
            {isPending ? t("deleting") : t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
