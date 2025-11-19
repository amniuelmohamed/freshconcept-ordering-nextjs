"use server";

import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Locale } from "@/i18n/routing";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  locale: z.string().optional(),
});

export type LoginPayload = z.infer<typeof loginSchema>;

export type LoginActionResult =
  | { status: "success" }
  | { status: "error"; code: "invalid-credentials" | "unknown" };

export async function loginAction(
  payload: LoginPayload,
): Promise<LoginActionResult> {
  const parsed = loginSchema.safeParse(payload);

  if (!parsed.success) {
    return { status: "error", code: "invalid-credentials" };
  }

  const locale = parsed.data.locale ?? "fr";
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { status: "error", code: "invalid-credentials" };
  }

  const { cookies } = await import("next/headers");
  const { defaultLocale, isLocale } = await import("@/i18n/routing");
  const cookieStore = await cookies();
  const normalizedLocale = isLocale(locale) ? locale : defaultLocale;
  
  cookieStore.set("locale", normalizedLocale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  // Use getSession() instead of getUser() - it's more efficient after signIn
  // The session is already available after signInWithPassword
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    return { status: "error", code: "unknown" };
  }

  const user = session.user;

  const { data: clientProfile } = await supabase
    .from("clients")
    .select("id, preferred_locale")
    .eq("id", user.id)
    .maybeSingle();

  if (clientProfile) {
    // Use client's preferred locale if available and valid
    const clientLocale = clientProfile.preferred_locale && isLocale(clientProfile.preferred_locale)
      ? clientProfile.preferred_locale
      : normalizedLocale;
    
    // Update the locale cookie to match the preferred locale
    cookieStore.set("locale", clientLocale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    
    const { redirect } = await import("next/navigation");
    redirect(`/${clientLocale}/dashboard`);
  }

  const { data: employeeProfile } = await supabase
    .from("employees")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (employeeProfile) {
    const { redirect } = await import("next/navigation");
    redirect(`/${normalizedLocale}/employee/dashboard`);
  }

  // If user exists in auth but not in clients or employees, sign them out
  await supabase.auth.signOut();

  return { status: "error", code: "unknown" };
}

const resetPasswordSchema = z.object({
  email: z.string().email(),
  locale: z.string().optional(),
});

export type ResetPasswordResult =
  | { status: "success" }
  | { status: "error"; code: "validation-error" | "not-found" | "unknown"; message?: string };

export async function resetPasswordAction(
  locale: Locale,
  formData: FormData,
): Promise<ResetPasswordResult> {
  try {
    const parsed = resetPasswordSchema.safeParse({
      email: formData.get("email"),
      locale: formData.get("locale") || locale,
    });

    if (!parsed.success) {
      return { status: "error", code: "validation-error", message: "Invalid email address" };
    }

    const adminClient = createAdminSupabaseClient();

    // Check if user exists (either as client or employee)
    const { data: users, error: listUsersError } = await adminClient.auth.admin.listUsers();
    
    if (listUsersError) {
      console.error("Error listing users:", listUsersError);
      return { status: "error", code: "unknown", message: "An error occurred. Please try again." };
    }

    const user = users?.users?.find(
      (u) => u.email?.toLowerCase() === parsed.data.email.toLowerCase(),
    );

    if (!user) {
      // User not found in auth.users
      return { status: "error", code: "not-found", message: "User not found" };
    }

    // Verify user is either a client or employee
    // Use admin client to bypass RLS policies for this check
    const [clientCheck, employeeCheck] = await Promise.all([
      adminClient.from("clients").select("id, preferred_locale").eq("id", user.id).maybeSingle(),
      adminClient.from("employees").select("id").eq("id", user.id).maybeSingle(),
    ]);

    // Check for errors in queries
    if (clientCheck.error) {
      console.error("Error checking clients table:", clientCheck.error);
      return { status: "error", code: "unknown", message: "An error occurred. Please try again." };
    }
    if (employeeCheck.error) {
      console.error("Error checking employees table:", employeeCheck.error);
      return { status: "error", code: "unknown", message: "An error occurred. Please try again." };
    }

    // Check if user exists in clients or employees
    if (!clientCheck.data && !employeeCheck.data) {
      // User exists in auth but not in clients or employees
      console.warn(`User ${user.id} (${parsed.data.email}) exists in auth.users but not in clients or employees table`);
      return { status: "error", code: "not-found", message: "User not found" };
    }

    // Get preferred locale from client if available, otherwise use provided locale
    const preferredLocale = clientCheck.data?.preferred_locale || parsed.data.locale || "fr";
    const { isLocale } = await import("@/i18n/routing");
    const finalLocale = isLocale(preferredLocale) ? preferredLocale : "fr";

    // Use the standard client to send password reset email
    // resetPasswordForEmail sends the email automatically
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      parsed.data.email,
      {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/${finalLocale}/set-password`,
      },
    );

    if (resetError) {
      console.error("Error sending password reset email:", resetError);
      return { status: "error", code: "unknown", message: "An error occurred. Please try again." };
    }

    // Email is sent automatically by resetPasswordForEmail
    return { status: "success" };
  } catch (error) {
    // Catch any unexpected errors
    console.error("Unexpected error in resetPasswordAction:", error);
    return { status: "error", code: "unknown", message: "An error occurred. Please try again." };
  }
}
