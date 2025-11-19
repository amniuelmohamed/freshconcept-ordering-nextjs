"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  deleteClientAction,
  type DeleteClientResult,
} from "@/app/[locale]/(employee)/employee/clients/actions";
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

type DeleteClientButtonProps = {
  locale: Locale;
  clientId: string;
  clientName: string;
  orderCount: number;
};

export function DeleteClientButton({
  locale,
  clientId,
  clientName,
  orderCount,
}: DeleteClientButtonProps) {
  const t = useTranslations("employeeClients.delete");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<DeleteClientResult | null>(null);
  const [open, setOpen] = useState(false);

  const handleDelete = () => {
    setResult(null);
    startTransition(async () => {
      const actionResult = await deleteClientAction(locale, clientId);
      setResult(actionResult);

      if (actionResult.status === "success") {
        toast.success(t("successMessage"));
        setOpen(false);
        // Use replace instead of push to avoid back button issues
        router.replace(`/${locale}/employee/clients`);
        router.refresh();
      } else if (actionResult.status === "error") {
        if (actionResult.code === "has-orders") {
          toast.error(t("cannotDelete", { count: orderCount }));
          setOpen(false);
        } else {
          toast.error(t("errorMessage"));
        }
      }
    });
  };

  if (orderCount > 0 || (result?.status === "error" && result.code === "has-orders")) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {orderCount === 1
            ? t("cannotDelete", { count: 1 })
            : t("cannotDelete", { count: orderCount })}
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
            {t("confirmMessage", { name: clientName })}
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
