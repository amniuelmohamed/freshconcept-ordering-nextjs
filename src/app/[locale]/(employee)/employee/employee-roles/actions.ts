"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/permissions";
import type { Locale } from "@/i18n/routing";
import type { TablesInsert, TablesUpdate } from "@/types/database";

const createEmployeeRoleSchema = z.object({
  nameFr: z.string().min(1, "French name is required"),
  nameNl: z.string().min(1, "Dutch name is required"),
  nameEn: z.string().min(1, "English name is required"),
  permissions: z.record(z.string(), z.boolean()).optional(),
});

const updateEmployeeRoleSchema = z.object({
  roleId: z.uuid(),
  nameFr: z.string().min(1, "French name is required").optional(),
  nameNl: z.string().min(1, "Dutch name is required").optional(),
  nameEn: z.string().min(1, "English name is required").optional(),
  permissions: z.record(z.string(), z.boolean()).optional(),
});

export type CreateEmployeeRoleResult =
  | { status: "success"; roleId: string }
  | { status: "error"; code: "validation-error" | "create-error" | "unauthorized" };

export type UpdateEmployeeRoleResult =
  | { status: "success" }
  | { status: "error"; code: "validation-error" | "not-found" | "update-error" | "unauthorized" };

export async function createEmployeeRoleAction(
  locale: Locale,
  formData: FormData,
): Promise<CreateEmployeeRoleResult> {
  try {
    await requirePermission(locale, "manage_employee_roles");
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return { status: "error", code: "unauthorized" };
    }
    throw error;
  }

  const parsed = createEmployeeRoleSchema.safeParse({
    nameFr: formData.get("nameFr"),
    nameNl: formData.get("nameNl"),
    nameEn: formData.get("nameEn"),
    permissions: formData.get("permissions")
      ? JSON.parse(String(formData.get("permissions")))
      : undefined,
  });

  if (!parsed.success) {
    return { status: "error", code: "validation-error" };
  }

  const supabase = await createClient();

  const roleInput: TablesInsert<"employee_roles"> = {
    name: {
      fr: parsed.data.nameFr,
      nl: parsed.data.nameNl,
      en: parsed.data.nameEn,
    },
    permissions: parsed.data.permissions || {},
  };

  const { data: role, error } = await supabase
    .from("employee_roles")
    .insert(roleInput)
    .select("id")
    .single();

  if (error || !role) {
    console.error("Error creating employee role:", error);
    return { status: "error", code: "create-error" };
  }

  revalidatePath(`/${locale}/employee/employee-roles`);
  return { status: "success", roleId: role.id };
}

export async function updateEmployeeRoleAction(
  locale: Locale,
  formData: FormData,
): Promise<UpdateEmployeeRoleResult> {
  try {
    await requirePermission(locale, "manage_employee_roles");
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return { status: "error", code: "unauthorized" };
    }
    throw error;
  }

  const nameFr = formData.get("nameFr");
  const nameNl = formData.get("nameNl");
  const nameEn = formData.get("nameEn");
  const permissionsStr = formData.get("permissions");

  const parsed = updateEmployeeRoleSchema.safeParse({
    roleId: formData.get("roleId"),
    nameFr: nameFr && String(nameFr).trim() ? String(nameFr).trim() : undefined,
    nameNl: nameNl && String(nameNl).trim() ? String(nameNl).trim() : undefined,
    nameEn: nameEn && String(nameEn).trim() ? String(nameEn).trim() : undefined,
    permissions: permissionsStr
      ? JSON.parse(String(permissionsStr))
      : undefined,
  });

  if (!parsed.success) {
    return { status: "error", code: "validation-error" };
  }

  const supabase = await createClient();

  // Verify role exists
  const { data: existingRole, error: fetchError } = await supabase
    .from("employee_roles")
    .select("id, name, permissions")
    .eq("id", parsed.data.roleId)
    .single();

  if (fetchError || !existingRole) {
    return { status: "error", code: "not-found" };
  }

  // Build update object
  const updateData: TablesUpdate<"employee_roles"> = {};

  if (parsed.data.nameFr || parsed.data.nameNl || parsed.data.nameEn) {
    const currentName = existingRole.name as { fr?: string; nl?: string; en?: string } | null;
    updateData.name = {
      fr: parsed.data.nameFr ?? currentName?.fr ?? "",
      nl: parsed.data.nameNl ?? currentName?.nl ?? "",
      en: parsed.data.nameEn ?? currentName?.en ?? "",
    };
  }

  if (parsed.data.permissions !== undefined) {
    updateData.permissions = parsed.data.permissions;
  }

  // Only update if there are changes
  if (Object.keys(updateData).length === 0) {
    return { status: "success" };
  }

  const { error: updateError } = await supabase
    .from("employee_roles")
    .update(updateData)
    .eq("id", parsed.data.roleId);

  if (updateError) {
    console.error("Error updating employee role:", updateError);
    return { status: "error", code: "update-error" };
  }

  revalidatePath(`/${locale}/employee/employee-roles/${parsed.data.roleId}`);
  revalidatePath(`/${locale}/employee/employee-roles`);

  return { status: "success" };
}

export type DeleteEmployeeRoleResult =
  | { status: "success" }
  | { status: "error"; code: "not-found" | "has-employees" | "delete-error" | "unauthorized" };

export async function deleteEmployeeRoleAction(
  locale: Locale,
  roleId: string,
): Promise<DeleteEmployeeRoleResult> {
  try {
    await requirePermission(locale, "manage_employee_roles");
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return { status: "error", code: "unauthorized" };
    }
    throw error;
  }

  const supabase = await createClient();

  // Verify role exists
  const { data: existingRole, error: fetchError } = await supabase
    .from("employee_roles")
    .select("id")
    .eq("id", roleId)
    .single();

  if (fetchError || !existingRole) {
    return { status: "error", code: "not-found" };
  }

  // Check if any employees are using this role
  const { data: employees, error: employeesError } = await supabase
    .from("employees")
    .select("id")
    .eq("employee_role_id", roleId)
    .limit(1);

  if (employeesError) {
    console.error("Error checking employees:", employeesError);
    return { status: "error", code: "delete-error" };
  }

  if (employees && employees.length > 0) {
    return { status: "error", code: "has-employees" };
  }

  // Delete the role
  const { error: deleteError } = await supabase
    .from("employee_roles")
    .delete()
    .eq("id", roleId);

  if (deleteError) {
    console.error("Error deleting employee role:", deleteError);
    return { status: "error", code: "delete-error" };
  }

  // Revalidate both list and detail pages
  revalidatePath(`/${locale}/employee/employee-roles`);
  revalidatePath(`/${locale}/employee/employee-roles/${roleId}`);

  return { status: "success" };
}

