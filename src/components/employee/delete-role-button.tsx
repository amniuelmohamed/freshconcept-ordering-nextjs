"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { deleteClientRoleAction, type DeleteClientRoleResult } from "@/app/[locale]/(employee)/employee/client-roles/actions";
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

type DeleteRoleButtonProps = {
  locale: Locale;
  roleId: string;
  roleName: string;
  clientCount: number;
};

export function DeleteRoleButton({
  locale,
  roleId,
  roleName,
  clientCount,
}: DeleteRoleButtonProps) {
  const t = useTranslations("clientRoles.delete");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [, setResult] = useState<DeleteClientRoleResult | null>(null);
  const [open, setOpen] = useState(false);

  const handleDelete = () => {
    setResult(null);
    startTransition(async () => {
      const actionResult = await deleteClientRoleAction(locale, roleId);
      setResult(actionResult);

      if (actionResult.status === "success") {
        toast.success(t("successMessage"));
        setOpen(false);
        router.push(`/${locale}/employee/client-roles`);
      } else if (actionResult.status === "error") {
        toast.error(t(`errors.${actionResult.code}`));
        setOpen(false);
      }
    });
  };

  if (clientCount > 0) {
    return (
      <Alert>
        <AlertDescription>
          {clientCount === 1
            ? t("cannotDeleteOne", { count: clientCount })
            : t("cannotDeleteMany", { count: clientCount })}
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
            {t("confirmMessage", { name: roleName })}
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
