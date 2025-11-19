"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/auth/permissions";
import type { Locale } from "@/i18n/routing";

const employeeCreationSchema = z.object({
  email: z.email(),
  fullName: z.string().min(1),
  employeeRoleId: z.uuid(),
});

const updateEmployeeSchema = z.object({
  employeeId: z.uuid(),
  fullName: z.string().min(1).optional(),
  employeeRoleId: z.uuid().optional(),
});

export type CreateEmployeeResult =
  | { status: "success"; employeeId: string }
  | {
      status: "error";
      code:
        | "validation-error"
        | "email-exists"
        | "role-not-found"
        | "user-creation-error"
        | "employee-creation-error"
        | "unauthorized";
    };

export type UpdateEmployeeResult =
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

export async function createEmployeeAction(
  locale: Locale,
  formData: FormData,
): Promise<CreateEmployeeResult> {
  try {
    await requirePermission(locale, "manage_employees");
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return { status: "error", code: "unauthorized" };
    }
    throw error;
  }

  const parsed = employeeCreationSchema.safeParse({
    email: formData.get("email"),
    fullName: formData.get("fullName"),
    employeeRoleId: formData.get("employeeRoleId"),
  });

  if (!parsed.success) {
    return { status: "error", code: "validation-error" };
  }

  const supabase = await createClient();
  const adminClient = createAdminSupabaseClient();

  // Verify role exists
  const { data: role, error: roleError } = await supabase
    .from("employee_roles")
    .select("id")
    .eq("id", parsed.data.employeeRoleId)
    .single();

  if (roleError || !role) {
    return { status: "error", code: "role-not-found" };
  }

  // Check if email already exists in auth.users
  const { data: existingUsers } = await adminClient.auth.admin.listUsers();
  const existingUser = existingUsers?.users.find(
    (u) => u.email?.toLowerCase() === parsed.data.email.toLowerCase(),
  );

  let userId: string;

  if (existingUser) {
    // Check if employee profile already exists
    const { data: existingEmployee } = await supabase
      .from("employees")
      .select("id")
      .eq("id", existingUser.id)
      .maybeSingle();

    if (existingEmployee) {
      return { status: "error", code: "email-exists" };
    }

    // User exists but no employee profile - use existing user ID
    userId = existingUser.id;

    // Send password setup email
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email: parsed.data.email,
    });

    if (linkError) {
      // Fallback to magiclink if recovery fails
      const { error: magicLinkError } = await adminClient.auth.admin.generateLink({
        type: "magiclink",
        email: parsed.data.email,
      });

      if (magicLinkError) {
        console.error("Error generating password setup link:", magicLinkError);
        // Continue anyway - the employee profile will be created
      }
    } else if (linkData?.properties?.action_link) {
      // The link is generated, but Supabase might not send the email automatically
      // You might need to send it manually via your email service
      console.log("Password setup link generated:", linkData.properties.action_link);
    }
  } else {
    // Create new user and send invitation email
    const { data: newUser, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      parsed.data.email,
      {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/${locale}/set-password`,
      },
    );

    if (inviteError) {
      console.error("Error sending invite email:", inviteError);
      return { status: "error", code: "user-creation-error" };
    }

    if (!newUser?.user?.id) {
      return { status: "error", code: "user-creation-error" };
    }

    userId = newUser.user.id;
  }

  // Create employee profile
  const { error: employeeError } = await supabase.from("employees").insert({
    id: userId,
    full_name: parsed.data.fullName,
    employee_role_id: parsed.data.employeeRoleId,
  });

  if (employeeError) {
    console.error("Error creating employee profile:", employeeError);
    return { status: "error", code: "employee-creation-error" };
  }

  revalidatePath(`/${locale}/employee/employees`);
  return { status: "success", employeeId: userId };
}

export async function updateEmployeeAction(
  locale: Locale,
  formData: FormData,
): Promise<UpdateEmployeeResult> {
  try {
    await requirePermission(locale, "manage_employees");
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return { status: "error", code: "unauthorized" };
    }
    throw error;
  }

  const parsed = updateEmployeeSchema.safeParse({
    employeeId: formData.get("employeeId"),
    fullName: formData.get("fullName"),
    employeeRoleId: formData.get("employeeRoleId"),
  });

  if (!parsed.success) {
    return { status: "error", code: "validation-error" };
  }

  const supabase = await createClient();

  // Verify employee exists
  const { data: existingEmployee, error: fetchError } = await supabase
    .from("employees")
    .select("id")
    .eq("id", parsed.data.employeeId)
    .single();

  if (fetchError || !existingEmployee) {
    return { status: "error", code: "not-found" };
  }

  // Verify role exists if provided
  if (parsed.data.employeeRoleId) {
    const { data: role, error: roleError } = await supabase
      .from("employee_roles")
      .select("id")
      .eq("id", parsed.data.employeeRoleId)
      .single();

    if (roleError || !role) {
      return { status: "error", code: "role-not-found" };
    }
  }

  // Build update object
  const updateData: {
    full_name?: string;
    employee_role_id?: string;
  } = {};

  if (parsed.data.fullName !== undefined) {
    updateData.full_name = parsed.data.fullName;
  }

  if (parsed.data.employeeRoleId !== undefined) {
    updateData.employee_role_id = parsed.data.employeeRoleId;
  }

  // Update employee
  const { error: updateError } = await supabase
    .from("employees")
    .update(updateData)
    .eq("id", parsed.data.employeeId);

  if (updateError) {
    console.error("Error updating employee:", updateError);
    return { status: "error", code: "update-error" };
  }

  revalidatePath(`/${locale}/employee/employees`);
  revalidatePath(`/${locale}/employee/employees/${parsed.data.employeeId}`);
  return { status: "success" };
}

export type DeleteEmployeeResult =
  | { status: "success" }
  | {
      status: "error";
      code: "not-found" | "delete-error" | "unauthorized";
    };

export async function deleteEmployeeAction(
  locale: Locale,
  employeeId: string,
): Promise<DeleteEmployeeResult> {
  try {
    await requirePermission(locale, "manage_employees");
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return { status: "error", code: "unauthorized" };
    }
    throw error;
  }

  const supabase = await createClient();
  const adminClient = createAdminSupabaseClient();

  // Verify employee exists
  const { data: existingEmployee, error: fetchError } = await supabase
    .from("employees")
    .select("id")
    .eq("id", employeeId)
    .single();

  if (fetchError || !existingEmployee) {
    return { status: "error", code: "not-found" };
  }

  // Delete employee profile first
  const { error: deleteEmployeeError } = await supabase
    .from("employees")
    .delete()
    .eq("id", employeeId);

  if (deleteEmployeeError) {
    console.error("Error deleting employee:", deleteEmployeeError);
    return { status: "error", code: "delete-error" };
  }

  // Delete auth user (this will cascade delete related data)
  try {
    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(employeeId);
    if (deleteUserError) {
      console.error("Error deleting auth user:", deleteUserError);
      // Continue anyway - employee profile is already deleted
    }
  } catch (error) {
    console.error("Error deleting auth user:", error);
    // Continue anyway - employee profile is already deleted
  }

  // Revalidate both list and detail pages
  revalidatePath(`/${locale}/employee/employees`);
  revalidatePath(`/${locale}/employee/employees/${employeeId}`);

  return { status: "success" };
}

