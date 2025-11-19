"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { resetPasswordAction, type ResetPasswordResult } from "@/app/[locale]/(auth)/login/actions";
import type { Locale } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

type ResetPasswordFormProps = {
  locale: Locale;
  onSuccess?: () => void;
};

export function ResetPasswordForm({ locale, onSuccess }: ResetPasswordFormProps) {
  const t = useTranslations("auth.resetPassword");
  const [isPending, startTransition] = useTransition();
  const [, setResult] = useState<ResetPasswordResult | null>(null);

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setResult(null);
    form.clearErrors();

    startTransition(async () => {
      const formData = new FormData();
      formData.append("email", values.email);
      formData.append("locale", locale);

      const actionResult = await resetPasswordAction(locale, formData);
      setResult(actionResult);

      if (actionResult.status === "success") {
        toast.success(t("successMessage"));
        form.reset();
        if (onSuccess) {
          onSuccess();
        }
      } else if (actionResult.status === "error") {
        toast.error(actionResult.message || t("errorMessage"));
      }
    });
  });

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("emailLabel")}</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    disabled={isPending}
                    placeholder={t("emailPlaceholder")}
                    {...field}
                  />
                </FormControl>
                <FormDescription>{t("description")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isPending} className="w-full h-11">
            {isPending ? t("sending") : t("submit")}
          </Button>
        </form>
      </Form>
    </div>
  );
}

