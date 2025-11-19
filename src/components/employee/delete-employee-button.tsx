"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  deleteEmployeeAction,
  type DeleteEmployeeResult,
} from "@/app/[locale]/(employee)/employee/employees/actions";
import type { Locale } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type DeleteEmployeeButtonProps = {
  locale: Locale;
  employeeId: string;
  employeeName: string;
};

export function DeleteEmployeeButton({
  locale,
  employeeId,
  employeeName,
}: DeleteEmployeeButtonProps) {
  const t = useTranslations("employeeEmployees.delete");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [, setResult] = useState<DeleteEmployeeResult | null>(null);
  const [open, setOpen] = useState(false);

  const handleDelete = () => {
    setResult(null);
    startTransition(async () => {
      const actionResult = await deleteEmployeeAction(locale, employeeId);
      setResult(actionResult);

      if (actionResult.status === "success") {
        toast.success(t("successMessage"));
        setOpen(false);
        // Use replace instead of push to avoid back button issues
        router.replace(`/${locale}/employee/employees`);
        router.refresh();
      } else if (actionResult.status === "error") {
        toast.error(t("errorMessage"));
      }
    });
  };

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
            {t("confirmMessage", { name: employeeName })}
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
