"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  deleteEmployeeRoleAction,
  type DeleteEmployeeRoleResult,
} from "@/app/[locale]/(employee)/employee/employee-roles/actions";
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

type DeleteEmployeeRoleButtonProps = {
  locale: Locale;
  roleId: string;
  roleName: string;
  employeeCount: number;
};

export function DeleteEmployeeRoleButton({
  locale,
  roleId,
  roleName,
  employeeCount,
}: DeleteEmployeeRoleButtonProps) {
  const t = useTranslations("employeeRoles.delete");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<DeleteEmployeeRoleResult | null>(null);
  const [open, setOpen] = useState(false);

  const handleDelete = () => {
    setResult(null);
    startTransition(async () => {
      const actionResult = await deleteEmployeeRoleAction(locale, roleId);
      setResult(actionResult);

      if (actionResult.status === "success") {
        toast.success(t("successMessage"));
        setOpen(false);
        // Use replace instead of push to avoid back button issues
        router.replace(`/${locale}/employee/employee-roles`);
        router.refresh();
      } else if (actionResult.status === "error") {
        if (actionResult.code === "has-employees") {
          toast.error(t("cannotDelete", { count: employeeCount }));
          setOpen(false);
        } else {
          toast.error(t("errorMessage"));
        }
      }
    });
  };

  if (employeeCount > 0 || (result?.status === "error" && result.code === "has-employees")) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {employeeCount === 1
            ? t("cannotDelete", { count: 1 })
            : t("cannotDelete", { count: employeeCount })}
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
            {isPending ? t("deleting") : t("confirmDelete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
