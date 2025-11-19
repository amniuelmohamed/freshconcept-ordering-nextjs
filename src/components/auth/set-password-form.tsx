"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { createClient } from "@/lib/supabase/client";
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

const setPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SetPasswordFormValues = z.infer<typeof setPasswordSchema>;

export function SetPasswordForm({ locale }: { locale: string }) {
  const t = useTranslations("auth.setPassword");
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isVerifying, setIsVerifying] = useState(true);

  const form = useForm<SetPasswordFormValues>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      // Check if we have hash fragments in the URL (Supabase passes tokens in hash)
      const hash = window.location.hash;
      if (hash) {
        // Parse hash fragments
        const hashParams = new URLSearchParams(hash.substring(1));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const type = hashParams.get("type");

        if (accessToken && type === "invite") {
          // Exchange the tokens for a session
          const supabase = createClient();
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || "",
          });

          if (!isMounted) return;

          if (error) {
            console.error("Error setting session:", error);
            setErrorMessage(t("errors.invalidLink"));
            setIsVerifying(false);
          } else {
            setIsVerifying(false);
            // Clear the hash from URL
            window.history.replaceState(null, "", window.location.pathname);
          }
        } else {
          if (isMounted) {
            setIsVerifying(false);
          }
        }
      } else {
        // Check if we already have a session
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (!session) {
          setErrorMessage(t("errors.invalidLink"));
        }
        setIsVerifying(false);
      }
    };

    verifySession();

    return () => {
      isMounted = false;
    };
  }, [t]);

  const onSubmit = form.handleSubmit((values) => {
    setErrorMessage(null);
    form.clearErrors();

    startTransition(async () => {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          setErrorMessage(t("errors.invalidLink"));
          return;
        }

        // Update user password
        const { error } = await supabase.auth.updateUser({
          password: values.password,
        });

        if (error) {
          console.error("Error updating password:", error);
          setErrorMessage(t("errors.updateFailed"));
          return;
        }

        // Password updated successfully, redirect to login
        router.push(`/${locale}/login?passwordSet=true`);
      } catch (error) {
        console.error("Error setting password:", error);
        setErrorMessage(t("errors.unknown"));
      }
    });
  });

  if (isVerifying) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-sm text-neutral-600">{t("verifying")}</p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="flex w-full flex-col gap-6" noValidate>
        <div className="flex flex-col gap-4">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("passwordLabel")}</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="new-password"
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
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("confirmPasswordLabel")}</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="new-password"
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

        <Button type="submit" disabled={isPending} className="h-11">
          {isPending ? t("submitting") : t("submit")}
        </Button>
      </form>
    </Form>
  );
}

