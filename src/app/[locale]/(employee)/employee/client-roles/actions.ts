"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import type { Locale } from "@/i18n/routing";
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

const createClientRoleSchema = z.object({
  nameFr: z.string().min(1, "French name is required"),
  nameNl: z.string().min(1, "Dutch name is required"),
  nameEn: z.string().min(1, "English name is required"),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  descriptionFr: z.string().optional(),
  descriptionNl: z.string().optional(),
  descriptionEn: z.string().optional(),
  defaultDeliveryDays: z
    .array(z.enum(DAYS_OF_WEEK))
    .min(1, "At least one delivery day is required"),
});

const updateClientRoleSchema = createClientRoleSchema.partial().extend({
  roleId: z.string().uuid(),
});

export type CreateClientRoleResult =
  | { status: "success"; roleId: string }
  | { status: "error"; code: "validation-error" | "slug-exists" | "create-error" | "unauthorized" };

export type UpdateClientRoleResult =
  | { status: "success" }
  | { status: "error"; code: "validation-error" | "slug-exists" | "not-found" | "update-error" | "unauthorized" };

export async function createClientRoleAction(
  locale: Locale,
  formData: FormData,
): Promise<CreateClientRoleResult> {
  // Use getSession() to avoid duplicate auth check (layout already verified)
  const session = await getSession();
  if (!session?.employeeProfile) {
    throw new Error("UNAUTHORIZED");
  }

  const parsed = createClientRoleSchema.safeParse({
    nameFr: formData.get("nameFr"),
    nameNl: formData.get("nameNl"),
    nameEn: formData.get("nameEn"),
    slug: formData.get("slug"),
    descriptionFr: formData.get("descriptionFr") || undefined,
    descriptionNl: formData.get("descriptionNl") || undefined,
    descriptionEn: formData.get("descriptionEn") || undefined,
    defaultDeliveryDays: JSON.parse(String(formData.get("defaultDeliveryDays") ?? "[]")),
  });

  if (!parsed.success) {
    return { status: "error", code: "validation-error" };
  }

  const supabase = await createClient();

  // Check if slug already exists
  const { data: existing } = await supabase
    .from("client_roles")
    .select("id")
    .eq("slug", parsed.data.slug)
    .single();

  if (existing) {
    return { status: "error", code: "slug-exists" };
  }

  const roleInput: TablesInsert<"client_roles"> = {
    name: {
      fr: parsed.data.nameFr,
      nl: parsed.data.nameNl,
      en: parsed.data.nameEn,
    },
    slug: parsed.data.slug,
    description: parsed.data.descriptionFr || parsed.data.descriptionNl || parsed.data.descriptionEn
      ? {
          fr: parsed.data.descriptionFr ?? null,
          nl: parsed.data.descriptionNl ?? null,
          en: parsed.data.descriptionEn ?? null,
        }
      : null,
    default_delivery_days: parsed.data.defaultDeliveryDays,
  };

  const { data: role, error } = await supabase
    .from("client_roles")
    .insert(roleInput)
    .select("id")
    .single();

  if (error || !role) {
    console.error("Error creating client role:", error);
    return { status: "error", code: "create-error" };
  }

  revalidatePath(`/${locale}/employee/client-roles`);
  return { status: "success", roleId: role.id };
}

export async function updateClientRoleAction(
  locale: Locale,
  formData: FormData,
): Promise<UpdateClientRoleResult> {
  // Use getSession() to avoid duplicate auth check (layout already verified)
  const session = await getSession();
  if (!session?.employeeProfile) {
    throw new Error("UNAUTHORIZED");
  }

  const parsed = updateClientRoleSchema.safeParse({
    roleId: formData.get("roleId"),
    nameFr: formData.get("nameFr") || undefined,
    nameNl: formData.get("nameNl") || undefined,
    nameEn: formData.get("nameEn") || undefined,
    slug: formData.get("slug") || undefined,
    descriptionFr: formData.get("descriptionFr") || undefined,
    descriptionNl: formData.get("descriptionNl") || undefined,
    descriptionEn: formData.get("descriptionEn") || undefined,
    defaultDeliveryDays: formData.get("defaultDeliveryDays")
      ? JSON.parse(String(formData.get("defaultDeliveryDays")))
      : undefined,
  });

  if (!parsed.success) {
    return { status: "error", code: "validation-error" };
  }

  const supabase = await createClient();

  // Verify role exists
  const { data: existingRole, error: fetchError } = await supabase
    .from("client_roles")
    .select("id, slug, name, description")
    .eq("id", parsed.data.roleId)
    .single();

  if (fetchError || !existingRole) {
    return { status: "error", code: "not-found" };
  }

  // Check if slug already exists (if changed)
  if (parsed.data.slug && parsed.data.slug !== existingRole.slug) {
    const { data: slugExists } = await supabase
      .from("client_roles")
      .select("id")
      .eq("slug", parsed.data.slug)
      .single();

    if (slugExists) {
      return { status: "error", code: "slug-exists" };
    }
  }

  // Build update object
  const updateData: TablesUpdate<"client_roles"> = {};

  if (parsed.data.nameFr || parsed.data.nameNl || parsed.data.nameEn) {
    const currentName = existingRole.name as { fr?: string; nl?: string; en?: string } | null;
    updateData.name = {
      fr: parsed.data.nameFr ?? currentName?.fr ?? "",
      nl: parsed.data.nameNl ?? currentName?.nl ?? "",
      en: parsed.data.nameEn ?? currentName?.en ?? "",
    };
  }

  if (parsed.data.slug) {
    updateData.slug = parsed.data.slug;
  }

  if (
    parsed.data.descriptionFr !== undefined ||
    parsed.data.descriptionNl !== undefined ||
    parsed.data.descriptionEn !== undefined
  ) {
    const currentDesc = existingRole.description as { fr?: string; nl?: string; en?: string } | null;
    updateData.description = {
      fr: parsed.data.descriptionFr ?? currentDesc?.fr ?? null,
      nl: parsed.data.descriptionNl ?? currentDesc?.nl ?? null,
      en: parsed.data.descriptionEn ?? currentDesc?.en ?? null,
    };
  }

  if (parsed.data.defaultDeliveryDays) {
    updateData.default_delivery_days = parsed.data.defaultDeliveryDays;
  }

  // Only update if there are changes
  if (Object.keys(updateData).length === 0) {
    return { status: "success" };
  }

  const { error: updateError } = await supabase
    .from("client_roles")
    .update(updateData)
    .eq("id", parsed.data.roleId);

  if (updateError) {
    console.error("Error updating client role:", updateError);
    return { status: "error", code: "update-error" };
  }

  revalidatePath(`/${locale}/employee/client-roles/${parsed.data.roleId}`);
  revalidatePath(`/${locale}/employee/client-roles`);

  return { status: "success" };
}

export type DeleteClientRoleResult =
  | { status: "success" }
  | { status: "error"; code: "not-found" | "has-clients" | "delete-error" | "unauthorized" };

export async function deleteClientRoleAction(
  locale: Locale,
  roleId: string,
): Promise<DeleteClientRoleResult> {
  // Use getSession() to avoid duplicate auth check (layout already verified)
  const session = await getSession();
  if (!session?.employeeProfile) {
    throw new Error("UNAUTHORIZED");
  }

  const supabase = await createClient();

  // Verify role exists
  const { data: existingRole, error: fetchError } = await supabase
    .from("client_roles")
    .select("id")
    .eq("id", roleId)
    .single();

  if (fetchError || !existingRole) {
    return { status: "error", code: "not-found" };
  }

  // Check if any clients are using this role
  const { data: clients, error: clientsError } = await supabase
    .from("clients")
    .select("id")
    .eq("client_role_id", roleId)
    .limit(1);

  if (clientsError) {
    console.error("Error checking clients:", clientsError);
    return { status: "error", code: "delete-error" };
  }

  if (clients && clients.length > 0) {
    return { status: "error", code: "has-clients" };
  }

  // Delete the role
  const { error: deleteError } = await supabase
    .from("client_roles")
    .delete()
    .eq("id", roleId);

  if (deleteError) {
    console.error("Error deleting client role:", deleteError);
    return { status: "error", code: "delete-error" };
  }

  revalidatePath(`/${locale}/employee/client-roles`);

  return { status: "success" };
}

