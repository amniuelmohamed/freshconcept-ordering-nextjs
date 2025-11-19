"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

// Password change schema
const passwordSchema = z.object({
  currentPassword: z.string().min(6, "Password must be at least 6 characters"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export type UpdateProfileResult =
  | { success: true }
  | { success: false; error: "unauthorized" | "validation-error" | "unknown"; message?: string };

export type ChangePasswordResult =
  | { success: true }
  | { success: false; error: "unauthorized" | "validation-error" | "wrong-password" | "unknown"; message?: string };

export async function updateProfileAction(
  prevState: UpdateProfileResult,
  formData: FormData
): Promise<UpdateProfileResult> {
  try {
    const session = await getSession();
    
    if (!session?.clientProfile) {
      return { success: false, error: "unauthorized" };
    }

    // Parse and validate form data
    // Note: contactEmail is not validated since it's disabled in the form and can't be changed
    const data = {
      companyName: (formData.get("companyName") as string) || "",
      contactName: (formData.get("contactName") as string) || "",
      phone: (formData.get("phone") as string) || "",
      mobile: (formData.get("mobile") as string) || "",
      street: (formData.get("street") as string) || "",
      city: (formData.get("city") as string) || "",
      postalCode: (formData.get("postalCode") as string) || "",
      country: (formData.get("country") as string) || "",
      preferredLocale: (formData.get("preferredLocale") as string) || "fr",
    };

    // Simplified schema without email validation
    const updateSchema = z.object({
      companyName: z.string().min(1, "Company name is required"),
      contactName: z.string().min(1, "Contact name is required"),
      phone: z.string(),
      mobile: z.string(),
      street: z.string(),
      city: z.string(),
      postalCode: z.string(),
      country: z.string(),
      preferredLocale: z.enum(["fr", "nl", "en"]),
    });

    const validated = updateSchema.safeParse(data);

    if (!validated.success) {
      return {
        success: false,
        error: "validation-error",
        message: validated.error.issues[0]?.message,
      };
    }

    const supabase = await createClient();

    // Prepare billing address JSON
    const billingAddress = {
      street: validated.data.street || "",
      city: validated.data.city || "",
      postalCode: validated.data.postalCode || "",
      country: validated.data.country || "",
    };

    // Update client profile
    const { error } = await supabase
      .from("clients")
      .update({
        company_name: validated.data.companyName,
        contact_name: validated.data.contactName,
        contact_phone: validated.data.phone || null,
        contact_mobile: validated.data.mobile || null,
        billing_address: billingAddress,
        preferred_locale: validated.data.preferredLocale,
      })
      .eq("id", session.clientProfile.id);

    if (error) {
      console.error("Error updating profile:", error);
      return { success: false, error: "unknown" };
    }

    revalidatePath("/[locale]/(client)/profile", "page");

    return { success: true };
  } catch (error) {
    console.error("Unexpected error updating profile:", error);
    return { success: false, error: "unknown" };
  }
}

export async function changePasswordAction(
  prevState: ChangePasswordResult,
  formData: FormData
): Promise<ChangePasswordResult> {
  try {
    const session = await getSession();
    
    if (!session?.clientProfile) {
      return { success: false, error: "unauthorized" };
    }

    // Parse and validate form data
    const data = {
      currentPassword: formData.get("currentPassword") as string,
      newPassword: formData.get("newPassword") as string,
      confirmPassword: formData.get("confirmPassword") as string,
    };

    const validated = passwordSchema.safeParse(data);

    if (!validated.success) {
      return {
        success: false,
        error: "validation-error",
        message: validated.error.issues[0]?.message,
      };
    }

    const supabase = await createClient();

    // Get client email from database
    const { data: clientData } = await supabase
      .from("clients")
      .select("contact_email")
      .eq("id", session.clientProfile.id)
      .single();

    if (!clientData?.contact_email) {
      return { success: false, error: "unknown", message: "Unable to verify email" };
    }

    // Verify current password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: clientData.contact_email,
      password: validated.data.currentPassword,
    });

    if (signInError) {
      return { success: false, error: "wrong-password", message: "Current password is incorrect" };
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: validated.data.newPassword,
    });

    if (updateError) {
      console.error("Error updating password:", updateError);
      return { success: false, error: "unknown" };
    }

    return { success: true };
  } catch (error) {
    console.error("Unexpected error changing password:", error);
    return { success: false, error: "unknown" };
  }
}

