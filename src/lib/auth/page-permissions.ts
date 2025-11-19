"use server";

import { redirect } from "next/navigation";
import { checkPermission } from "./permissions";
import { getSession } from "./session";
import type { Locale } from "@/i18n/routing";

// Cache permission checks for the current request to avoid duplicate RPC calls
const permissionCache = new Map<string, Promise<boolean>>();

/**
 * Requires that the current employee has at least one of the specified permissions.
 * Redirects to unauthorized page if no permissions are met.
 * 
 * Note: This assumes requireEmployee was already called in the layout to avoid duplicate auth checks.
 */
export async function requirePagePermission(
  locale: Locale,
  permissions: string[],
): Promise<void> {
  // Only verify employee status, don't call requireEmployee which does full auth check
  // The layout already verified this, so we can skip the redundant check
  const session = await getSession();
  if (!session?.employeeProfile) {
    redirect(`/${locale}/login`);
  }

  if (permissions.length === 0) {
    return; // No permissions required
  }

  // Check if user has at least one of the required permissions
  // Use cached results to avoid duplicate RPC calls
  for (const permission of permissions) {
    let permissionPromise = permissionCache.get(permission);
    if (!permissionPromise) {
      permissionPromise = checkPermission(permission);
      permissionCache.set(permission, permissionPromise);
    }
    const hasPermission = await permissionPromise;
    if (hasPermission) {
      return; // User has at least one required permission
    }
  }

  // User doesn't have any of the required permissions, redirect to unauthorized
  redirect(`/${locale}/employee/unauthorized`);
}

// Cache permission checks for the current request
const permissionCheckCache = new Map<string, Promise<boolean>>();

/**
 * Checks if the current employee has a specific permission.
 * Returns false if not an employee.
 * Uses caching to avoid duplicate RPC calls within the same request.
 */
export async function hasPagePermission(permission: string): Promise<boolean> {
  try {
    // Check cache first
    let permissionPromise = permissionCheckCache.get(permission);
    if (!permissionPromise) {
      permissionPromise = checkPermission(permission);
      permissionCheckCache.set(permission, permissionPromise);
    }
    return await permissionPromise;
  } catch {
    return false;
  }
}

