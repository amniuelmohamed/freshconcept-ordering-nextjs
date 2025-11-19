"use server";

import { createClient } from "@/lib/supabase/server";
import { getSession } from "./session";
import type { Locale } from "@/i18n/routing";

// Cache permission checks per request to avoid duplicate RPC calls
const permissionCache = new Map<string, Promise<boolean>>();

/**
 * Checks if the current employee has a specific permission.
 * This uses the database function `has_permission` which checks
 * the employee's role permissions.
 * Results are cached per request to avoid duplicate RPC calls.
 *
 * @param permissionName - The name of the permission to check (e.g., 'manage_clients')
 * @returns true if the employee has the permission, false otherwise
 */
export async function checkPermission(permissionName: string): Promise<boolean> {
  // Check cache first
  const cached = permissionCache.get(permissionName);
  if (cached) {
    return cached;
  }

  const supabase = await createClient();

  const permissionPromise: Promise<boolean> = supabase.rpc("has_permission", {
    permission_name: permissionName,
  }).then(({ data, error }) => {
    if (error) {
      console.error("Error checking permission:", error);
      return false;
    }
    return data === true;
  }) as Promise<boolean>;

  // Cache the promise (not the result) so concurrent calls share the same promise
  permissionCache.set(permissionName, permissionPromise);

  return permissionPromise;
}

/**
 * Requires that the current employee has a specific permission.
 * If the employee doesn't have the permission, throws an error.
 * This should be used in server actions that require specific permissions.
 * Uses getSession() instead of requireEmployee() to avoid duplicate auth checks.
 *
 * @param locale - The current locale
 * @param permissionName - The name of the permission to check
 * @throws Error if the employee doesn't have the permission
 */
export async function requirePermission(
  locale: Locale,
  permissionName: string,
): Promise<void> {
  // Use getSession() instead of requireEmployee() to avoid duplicate auth API calls
  // getSession() uses cached session data, requireEmployee() would call getUser()
  const session = await getSession();
  
  if (!session?.employeeProfile) {
    throw new Error("UNAUTHORIZED");
  }

  const hasPermission = await checkPermission(permissionName);

  if (!hasPermission) {
    throw new Error("UNAUTHORIZED");
  }
}

