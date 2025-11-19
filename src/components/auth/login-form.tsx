"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import type { Locale } from "@/i18n/routing";

import { loginAction } from "@/app/[locale]/(auth)/login/actions";
import type { LoginActionResult } from "@/app/[locale]/(auth)/login/actions";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { loginSchema, type LoginInput } from "@/lib/validations/schemas";

export function LoginForm({ locale }: { locale: Locale }) {
  const t = useTranslations("auth.login");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setErrorMessage(null);
    form.clearErrors();

    startTransition(async () => {
      try {
        const result: LoginActionResult | void = await loginAction({
          ...values,
          locale,
        });

        if (result && result.status === "error") {
          if (result.code === "invalid-credentials") {
            setErrorMessage(t("errors.invalidCredentials"));
            form.setError("email", { message: t("errors.invalidCredentials") });
            form.setError("password", {
              message: t("errors.invalidCredentials"),
            });
          } else {
            setErrorMessage(t("errors.unknown"));
          }
        }
        // If result is undefined, it means redirect() was called (successful login)
        // redirect() throws a special exception that Next.js handles, so we don't need to do anything
      } catch (error) {
        // Check if this is a Next.js redirect exception
        // Next.js redirect() throws an error with a specific digest
        if (error && typeof error === "object" && "digest" in error) {
          const nextError = error as { digest?: string };
          // NEXT_REDIRECT is the digest for redirect exceptions
          if (nextError.digest?.startsWith("NEXT_REDIRECT")) {
            // This is a redirect, let it propagate - don't show error
            throw error;
          }
        }
        // Only show error for actual errors, not redirects
        setErrorMessage(t("errors.unknown"));
      }
    });
  });

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form
          onSubmit={onSubmit}
          className="flex w-full flex-col gap-6"
          noValidate
        >
          <div className="flex flex-col gap-4">
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
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("passwordLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="current-password"
                      disabled={isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {errorMessage ? (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}

          <Button type="submit" disabled={isPending} className="h-11 w-full">
            {isPending ? t("loading") : t("submit")}
          </Button>
        </form>
      </Form>
      
      <div className="text-center">
        <Button asChild variant="link" className="text-sm text-muted-foreground">
          <Link href={`/${locale}/reset-password`}>
            {t("forgotPassword")}
          </Link>
        </Button>
      </div>
    </div>
  );
}

