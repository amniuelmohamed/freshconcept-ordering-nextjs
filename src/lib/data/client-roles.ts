import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type ClientRoleRow = Database["public"]["Tables"]["client_roles"]["Row"];

export type ClientRoleWithCount = ClientRoleRow & {
  clientCount: number;
};

/**
 * Fetches all client roles with the count of clients using each role.
 */
export const getClientRoles = cache(async (): Promise<ClientRoleWithCount[]> => {
  const supabase = await createClient();

  const { data: roles, error: rolesError } = await supabase
    .from("client_roles")
    .select("*")
    .order("slug", { ascending: true });

  if (rolesError || !roles) {
    console.error("Error fetching client roles:", rolesError);
    return [];
  }

  // Get client counts for each role
  const roleIds = roles.map((role) => role.id);
  const { data: clients, error: clientsError } = await supabase
    .from("clients")
    .select("client_role_id")
    .in("client_role_id", roleIds);

  if (clientsError) {
    console.error("Error fetching client counts:", clientsError);
  }

  // Count clients per role
  const clientCounts = new Map<string, number>();
  clients?.forEach((client) => {
    if (client.client_role_id) {
      clientCounts.set(
        client.client_role_id,
        (clientCounts.get(client.client_role_id) ?? 0) + 1,
      );
    }
  });

  return roles.map((role) => ({
    ...role,
    clientCount: clientCounts.get(role.id) ?? 0,
  }));
});

/**
 * Fetches a single client role by ID.
 */
export const getClientRoleById = cache(async (roleId: string) => {
  const supabase = await createClient();

  const { data: role, error } = await supabase
    .from("client_roles")
    .select("*")
    .eq("id", roleId)
    .single<ClientRoleRow>();

  if (error || !role) {
    return null;
  }

  return role;
});

