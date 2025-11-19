"use client";

import { useActionState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { changePasswordAction, type ChangePasswordResult } from "@/app/[locale]/(client)/profile/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ChangePasswordResult = { success: true };

export function PasswordForm() {
  const t = useTranslations("clientProfile");
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(
    changePasswordAction,
    initialState
  );

  useEffect(() => {
    if (state !== initialState) {
      if (state.success) {
        toast.success(t("messages.passwordSuccess"));
        formRef.current?.reset();
      } else if (state.error) {
        toast.error(state.message || t("messages.passwordError"));
      }
    }
  }, [state, t]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="currentPassword">{t("form.currentPassword")}</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          disabled={isPending}
          autoComplete="current-password"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="newPassword">{t("form.newPassword")}</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={6}
          disabled={isPending}
          autoComplete="new-password"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">{t("form.confirmPassword")}</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={6}
          disabled={isPending}
          autoComplete="new-password"
        />
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? t("form.changingPassword") : t("form.changePassword")}
      </Button>
    </form>
  );
}

