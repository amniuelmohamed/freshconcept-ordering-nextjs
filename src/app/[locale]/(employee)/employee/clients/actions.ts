"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/auth/permissions";
import type { Locale } from "@/i18n/routing";
import { clientCreationSchema } from "@/lib/validations/schemas";
import type { TablesInsert, TablesUpdate } from "@/types/database";

const DAYS_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const addressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
}).optional();

const updateClientSchema = z.object({
  clientId: z.string().uuid(),
  companyName: z.string().min(1).optional(),
  contactName: z.string().min(1).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  contactMobile: z.string().optional(),
  clientRoleId: z.string().uuid().optional(),
  remise: z.number().min(0).max(100).optional(),
  deliveryDays: z.array(z.enum(DAYS_OF_WEEK)).optional(),
  preferredLocale: z.enum(["fr", "nl", "en"]).optional(),
  tvaNumber: z.string().optional(),
  shippingAddress: addressSchema,
  billingAddress: addressSchema,
  billingAddressDifferent: z.boolean().optional(),
});

export type CreateClientResult =
  | { status: "success"; clientId: string }
  | {
      status: "error";
      code:
        | "validation-error"
        | "email-exists"
        | "role-not-found"
        | "user-creation-error"
        | "client-creation-error"
        | "unauthorized";
    };

export type UpdateClientResult =
  | { status: "success" }
  | {
      status: "error";
      code:
        | "validation-error"
        | "not-found"
        | "role-not-found"
        | "update-error"
        | "unauthorized";
    };

export async function createClientAction(
  locale: Locale,
  formData: FormData,
): Promise<CreateClientResult> {
  try {
    await requirePermission(locale, "manage_clients");
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return { status: "error", code: "unauthorized" };
    }
    throw error;
  }

  const parsed = clientCreationSchema.safeParse({
    email: formData.get("email"),
    companyName: formData.get("companyName"),
    contactName: formData.get("contactName"),
    contactPhone: formData.get("contactPhone") || undefined,
    contactMobile: formData.get("contactMobile") || undefined,
    clientRoleId: formData.get("clientRoleId"),
    remise: Number(formData.get("remise")),
    deliveryDays: JSON.parse(String(formData.get("deliveryDays") ?? "[]")),
    preferredLocale: formData.get("preferredLocale"),
    tvaNumber: formData.get("tvaNumber") || undefined,
    shippingAddress: formData.get("shippingAddress")
      ? JSON.parse(String(formData.get("shippingAddress")))
      : undefined,
    billingAddress: formData.get("billingAddress")
      ? JSON.parse(String(formData.get("billingAddress")))
      : undefined,
    billingAddressDifferent: formData.get("billingAddressDifferent") === "true" || undefined,
  });

  if (!parsed.success) {
    return { status: "error", code: "validation-error" };
  }

  const supabase = await createClient();
  const adminClient = createAdminSupabaseClient();

  // Verify role exists first
  const { data: role, error: roleError } = await supabase
    .from("client_roles")
    .select("id, default_delivery_days")
    .eq("id", parsed.data.clientRoleId)
    .single();

  if (roleError || !role) {
    return { status: "error", code: "role-not-found" };
  }

  // Check if email already exists in auth.users
  let existingAuthUser: { id: string } | null = null;
  try {
    const { data: users, error: listError } = await adminClient.auth.admin.listUsers();
    
    if (!listError && users?.users) {
      const foundUser = users.users.find(
        (user) => user.email?.toLowerCase() === parsed.data.email.toLowerCase(),
      );
      
      if (foundUser) {
        existingAuthUser = { id: foundUser.id };
      }
    }
  } catch (error) {
    // If listUsers fails, we'll try to create anyway and handle the error
    console.warn("Could not check existing users, proceeding with creation:", error);
  }

  let userId: string;
  let isNewUser = false;
  let shouldSendInviteEmail = false;

  if (existingAuthUser) {
    // User exists in auth.users - check if they have a client profile
    const { data: existingClient, error: clientCheckError } = await supabase
      .from("clients")
      .select("id")
      .eq("id", existingAuthUser.id)
      .single();

    if (clientCheckError && clientCheckError.code !== "PGRST116") {
      // PGRST116 is "not found" - that's expected if no client profile exists
      console.error("Error checking existing client:", clientCheckError);
      return { status: "error", code: "client-creation-error" };
    }

    if (existingClient) {
      // User exists and has a client profile
      return { status: "error", code: "email-exists" };
    }

    // User exists in auth.users but no client profile - use existing user ID
    userId = existingAuthUser.id;
    shouldSendInviteEmail = true; // Send recovery email for existing user
  } else {
    // For new users, use inviteUserByEmail which creates the user AND sends the email
    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      parsed.data.email,
      {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/${locale}/set-password`,
        data: {
          type: "client",
        },
      },
    );

    if (inviteError) {
      console.error("Error inviting user:", inviteError);
      // Check if error is due to email already existing (fallback check)
      const errorMessage = inviteError.message?.toLowerCase() || "";
      if (
        errorMessage.includes("already") ||
        errorMessage.includes("exists") ||
        errorMessage.includes("registered") ||
        errorMessage.includes("duplicate")
      ) {
        return { status: "error", code: "email-exists" };
      }
      return { status: "error", code: "user-creation-error" };
    }

    // Get the user ID after invitation
    // We need to fetch it since inviteUserByEmail doesn't return the user
    try {
      const { data: users } = await adminClient.auth.admin.listUsers();
      const invitedUser = users?.users?.find(
        (user) => user.email?.toLowerCase() === parsed.data.email.toLowerCase(),
      );
      
      if (!invitedUser) {
        console.error("User was invited but not found in auth.users");
        return { status: "error", code: "user-creation-error" };
      }
      
      userId = invitedUser.id;
      isNewUser = true;
      // Email is already sent by inviteUserByEmail
    } catch (error) {
      console.error("Error fetching invited user:", error);
      return { status: "error", code: "user-creation-error" };
    }
  }

  // Use role's default delivery days if not provided
  const deliveryDays =
    parsed.data.deliveryDays.length > 0
      ? parsed.data.deliveryDays
      : (role.default_delivery_days as typeof DAYS_OF_WEEK[number][] | null) ?? [];

  // Handle addresses: if billing is different, use separate addresses, otherwise copy shipping to billing
  const shippingAddress = parsed.data.shippingAddress || null;
  const billingAddress = parsed.data.billingAddressDifferent && parsed.data.billingAddress
    ? parsed.data.billingAddress
    : shippingAddress; // If not different, use shipping address

  // Create client profile
  const clientInput: TablesInsert<"clients"> = {
    id: userId,
    company_name: parsed.data.companyName,
    contact_name: parsed.data.contactName,
    contact_email: parsed.data.email,
    contact_phone: parsed.data.contactPhone || null,
    contact_mobile: parsed.data.contactMobile || null,
    client_role_id: parsed.data.clientRoleId,
    remise: parsed.data.remise,
    delivery_days: deliveryDays,
    preferred_locale: parsed.data.preferredLocale,
    tva_number: parsed.data.tvaNumber || null,
    billing_address: billingAddress,
    shipping_address: shippingAddress,
  };

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .insert(clientInput)
    .select("id")
    .single();

  if (clientError || !client) {
    // If client creation fails and we created a new user, try to clean up the auth user
    if (isNewUser) {
      await adminClient.auth.admin.deleteUser(userId);
    }
    console.error("Error creating client:", clientError);
    return { status: "error", code: "client-creation-error" };
  }

  // Send password setup email for existing users (new users already got email from inviteUserByEmail)
  if (shouldSendInviteEmail) {
    try {
      // For existing users, send a recovery email so they can set their password
      const { error: recoveryError } = await adminClient.auth.admin.generateLink({
        type: "recovery",
        email: parsed.data.email,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/${locale}/set-password`,
        },
      });

      if (recoveryError) {
        console.error("Error generating recovery link:", recoveryError);
        // Try magiclink as fallback
        const { error: magiclinkError } = await adminClient.auth.admin.generateLink({
          type: "magiclink",
          email: parsed.data.email,
          options: {
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/${locale}/set-password`,
          },
        });

        if (magiclinkError) {
          console.error("Error generating magiclink:", magiclinkError);
          // Continue anyway - the user was created successfully, they can reset password later
        }
      }
    } catch (error) {
      console.error("Error sending password setup email:", error);
      // Continue anyway - the user was created successfully
    }
  }

  revalidatePath(`/${locale}/employee/clients`);
  return { status: "success", clientId: client.id };
}

export async function updateClientAction(
  locale: Locale,
  formData: FormData,
): Promise<UpdateClientResult> {
  try {
    await requirePermission(locale, "manage_clients");
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return { status: "error", code: "unauthorized" };
    }
    throw error;
  }

  const parsed = updateClientSchema.safeParse({
    clientId: formData.get("clientId"),
    companyName: formData.get("companyName") || undefined,
    contactName: formData.get("contactName") || undefined,
    contactEmail: formData.get("contactEmail") || undefined,
    contactPhone: formData.get("contactPhone") || undefined,
    contactMobile: formData.get("contactMobile") || undefined,
    clientRoleId: formData.get("clientRoleId") || undefined,
    remise: formData.get("remise") ? Number(formData.get("remise")) : undefined,
    deliveryDays: formData.get("deliveryDays")
      ? JSON.parse(String(formData.get("deliveryDays")))
      : undefined,
    preferredLocale: formData.get("preferredLocale") || undefined,
    tvaNumber: formData.get("tvaNumber") || undefined,
    shippingAddress: formData.get("shippingAddress")
      ? JSON.parse(String(formData.get("shippingAddress")))
      : undefined,
    billingAddress: formData.get("billingAddress")
      ? JSON.parse(String(formData.get("billingAddress")))
      : undefined,
    billingAddressDifferent: formData.get("billingAddressDifferent") === "true" || undefined,
  });

  if (!parsed.success) {
    return { status: "error", code: "validation-error" };
  }

  const supabase = await createClient();

  // Verify client exists
  const { data: existingClient, error: fetchError } = await supabase
    .from("clients")
    .select("id")
    .eq("id", parsed.data.clientId)
    .single();

  if (fetchError || !existingClient) {
    return { status: "error", code: "not-found" };
  }

  // Verify role exists if provided
  if (parsed.data.clientRoleId) {
    const { data: role, error: roleError } = await supabase
      .from("client_roles")
      .select("id")
      .eq("id", parsed.data.clientRoleId)
      .single();

    if (roleError || !role) {
      return { status: "error", code: "role-not-found" };
    }
  }

  // Build update object
  const updateData: TablesUpdate<"clients"> = {};

  if (parsed.data.companyName !== undefined) {
    updateData.company_name = parsed.data.companyName;
  }
  if (parsed.data.contactName !== undefined) {
    updateData.contact_name = parsed.data.contactName;
  }
  if (parsed.data.contactEmail !== undefined) {
    updateData.contact_email = parsed.data.contactEmail;
  }
  if (parsed.data.contactPhone !== undefined) {
    updateData.contact_phone = parsed.data.contactPhone;
  }
  if (parsed.data.contactMobile !== undefined) {
    updateData.contact_mobile = parsed.data.contactMobile;
  }
  if (parsed.data.clientRoleId !== undefined) {
    updateData.client_role_id = parsed.data.clientRoleId;
  }
  if (parsed.data.remise !== undefined) {
    updateData.remise = parsed.data.remise;
  }
  if (parsed.data.deliveryDays !== undefined) {
    updateData.delivery_days = parsed.data.deliveryDays;
  }
  if (parsed.data.preferredLocale !== undefined) {
    updateData.preferred_locale = parsed.data.preferredLocale;
  }
  if (parsed.data.tvaNumber !== undefined) {
    updateData.tva_number = parsed.data.tvaNumber;
  }
  
  // Handle addresses: if billing is different, use separate addresses, otherwise copy shipping to billing
  if (parsed.data.shippingAddress !== undefined) {
    updateData.shipping_address = parsed.data.shippingAddress || null;
    
    // If billing address is not explicitly different, copy shipping to billing
    if (!parsed.data.billingAddressDifferent) {
      updateData.billing_address = parsed.data.shippingAddress || null;
    } else if (parsed.data.billingAddress !== undefined) {
      // If different and billing address is provided, use it
      updateData.billing_address = parsed.data.billingAddress || null;
    }
  } else if (parsed.data.billingAddress !== undefined && parsed.data.billingAddressDifferent) {
    // If only billing address is updated and it's different
    updateData.billing_address = parsed.data.billingAddress || null;
  }

  // Only update if there are changes
  if (Object.keys(updateData).length === 0) {
    return { status: "success" };
  }

  const { error: updateError } = await supabase
    .from("clients")
    .update(updateData)
    .eq("id", parsed.data.clientId);

  if (updateError) {
    console.error("Error updating client:", updateError);
    return { status: "error", code: "update-error" };
  }

  revalidatePath(`/${locale}/employee/clients/${parsed.data.clientId}`);
  revalidatePath(`/${locale}/employee/clients`);

  return { status: "success" };
}

export type DeleteClientResult =
  | { status: "success" }
  | {
      status: "error";
      code: "not-found" | "has-orders" | "delete-error" | "unauthorized";
    };

export async function deleteClientAction(
  locale: Locale,
  clientId: string,
): Promise<DeleteClientResult> {
  try {
    await requirePermission(locale, "manage_clients");
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return { status: "error", code: "unauthorized" };
    }
    throw error;
  }

  const supabase = await createClient();
  const adminClient = createAdminSupabaseClient();

  // Verify client exists
  const { data: existingClient, error: fetchError } = await supabase
    .from("clients")
    .select("id, contact_email")
    .eq("id", clientId)
    .single();

  if (fetchError || !existingClient) {
    return { status: "error", code: "not-found" };
  }

  // Check if client has any orders
  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("id")
    .eq("client_id", clientId)
    .limit(1);

  if (ordersError) {
    console.error("Error checking orders:", ordersError);
    return { status: "error", code: "delete-error" };
  }

  if (orders && orders.length > 0) {
    return { status: "error", code: "has-orders" };
  }

  // Delete client profile first
  const { error: deleteClientError } = await supabase
    .from("clients")
    .delete()
    .eq("id", clientId);

  if (deleteClientError) {
    console.error("Error deleting client:", deleteClientError);
    return { status: "error", code: "delete-error" };
  }

  // Delete auth user (this will cascade delete related data)
  try {
    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(clientId);
    if (deleteUserError) {
      console.error("Error deleting auth user:", deleteUserError);
      // Continue anyway - client profile is already deleted
    }
  } catch (error) {
    console.error("Error deleting auth user:", error);
    // Continue anyway - client profile is already deleted
  }

  // Revalidate both list and detail pages
  revalidatePath(`/${locale}/employee/clients`);
  revalidatePath(`/${locale}/employee/clients/${clientId}`);

  return { status: "success" };
}

