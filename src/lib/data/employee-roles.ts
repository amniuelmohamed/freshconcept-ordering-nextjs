import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type EmployeeRoleRow = Database["public"]["Tables"]["employee_roles"]["Row"];

export type EmployeeRoleWithCount = EmployeeRoleRow & {
  employeeCount: number;
};

export const getEmployeeRoles = cache(async (): Promise<EmployeeRoleWithCount[]> => {
  const supabase = await createClient();

  const { data: roles, error } = await supabase
    .from("employee_roles")
    .select("id, name, permissions, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching employee roles:", error);
    return [];
  }

  if (!roles || roles.length === 0) {
    return [];
  }

  // Get employee count for each role
  const roleIds = roles.map((role) => role.id);
  const { data: employeeCounts } = await supabase
    .from("employees")
    .select("employee_role_id")
    .in("employee_role_id", roleIds);

  const countMap = new Map<string, number>();
  employeeCounts?.forEach((emp) => {
    if (emp.employee_role_id) {
      countMap.set(
        emp.employee_role_id,
        (countMap.get(emp.employee_role_id) || 0) + 1,
      );
    }
  });

  return roles.map((role) => ({
    ...role,
    employeeCount: countMap.get(role.id) || 0,
  }));
});

export const getEmployeeRoleById = cache(async (
  id: string,
): Promise<EmployeeRoleRow | null> => {
  const supabase = await createClient();

  const { data: role, error } = await supabase
    .from("employee_roles")
    .select("id, name, permissions, created_at")
    .eq("id", id)
    .single();

  if (error) {
    // Don't log error if role simply doesn't exist (PGRST116 = not found)
    // This is normal after deletion
    if (error.code !== "PGRST116") {
      console.error("Error fetching employee role:", {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        id,
      });
    }
    return null;
  }

  if (!role) {
    console.warn("Employee role not found:", id);
    return null;
  }

  return role;
});

