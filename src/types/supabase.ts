import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database";

export type { Database };

export type SupabaseTypedClient = SupabaseClient<Database>;

