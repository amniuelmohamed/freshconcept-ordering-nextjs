import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type ClientRow = Database["public"]["Tables"]["clients"]["Row"];
type ClientRoleRow = Database["public"]["Tables"]["client_roles"]["Row"];

export type ClientWithRole = ClientRow & {
  client_roles: Pick<ClientRoleRow, "id" | "name" | "slug"> | null;
};

/**
 * Fetches all clients with their role information.
 */
export const getClients = cache(async (): Promise<ClientWithRole[]> => {
  const supabase = await createClient();

  const { data: clients, error } = await supabase
    .from("clients")
    .select(
      `
      *,
      client_roles:client_roles(
        id,
        name,
        slug
      )
    `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching clients:", error);
    return [];
  }

  return (clients as ClientWithRole[]) ?? [];
});

/**
 * Fetches a single client by ID with role information.
 */
export const getClientById = cache(async (clientId: string) => {
  const supabase = await createClient();

  const { data: client, error } = await supabase
    .from("clients")
    .select(
      `
      *,
      client_roles:client_roles(
        id,
        name,
        slug,
        default_delivery_days
      )
    `,
    )
    .eq("id", clientId)
    .single<ClientWithRole>();

  if (error || !client) {
    return null;
  }

  return client;
});

