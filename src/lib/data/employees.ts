import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type EmployeeRow = Database["public"]["Tables"]["employees"]["Row"];
type EmployeeRoleRow = Database["public"]["Tables"]["employee_roles"]["Row"];

export type EmployeeWithRole = EmployeeRow & {
  employee_roles: Pick<EmployeeRoleRow, "id" | "name"> | null;
  email?: string | null;
};

/**
 * Fetches all employees with their role information and email.
 */
export const getEmployees = cache(async (): Promise<EmployeeWithRole[]> => {
  const supabase = await createClient();
  const adminClient = createAdminSupabaseClient();

  const { data: employees, error } = await supabase
    .from("employees")
    .select(
      `
      *,
      employee_roles:employee_roles(
        id,
        name
      )
    `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching employees:", error);
    return [];
  }

  if (!employees || employees.length === 0) {
    return [];
  }

  // Fetch emails from auth.users using Admin API
  const { data: users, error: usersError } = await adminClient.auth.admin.listUsers();

  if (usersError) {
    console.error("Error fetching user emails:", usersError);
    // Return employees without emails if we can't fetch them
    return (employees as EmployeeWithRole[]) ?? [];
  }

  // Create a map of user ID to email
  const emailMap = new Map<string, string | null>();
  users?.users?.forEach((user) => {
    emailMap.set(user.id, user.email ?? null);
  });

  // Add emails to employees
  const employeesWithEmail = employees.map((employee) => ({
    ...employee,
    email: emailMap.get(employee.id) ?? null,
  })) as EmployeeWithRole[];

  return employeesWithEmail;
});

/**
 * Fetches a single employee by ID with role information and email.
 */
export const getEmployeeById = cache(async (employeeId: string) => {
  const supabase = await createClient();
  const adminClient = createAdminSupabaseClient();

  const { data: employee, error } = await supabase
    .from("employees")
    .select(
      `
      *,
      employee_roles:employee_roles(
        id,
        name
      )
    `,
    )
    .eq("id", employeeId)
    .single<EmployeeWithRole>();

  if (error || !employee) {
    return null;
  }

  // Fetch email from auth.users using Admin API
  try {
    const { data: user, error: userError } = await adminClient.auth.admin.getUserById(employeeId);

    if (!userError && user?.user) {
      return {
        ...employee,
        email: user.user.email ?? null,
      } as EmployeeWithRole;
    }
  } catch (error) {
    console.error("Error fetching user email:", error);
  }

  // Return employee without email if we can't fetch it
  return employee;
});
