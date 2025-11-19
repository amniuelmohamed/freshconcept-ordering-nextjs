"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import type { Locale } from "@/i18n/routing";

export type ToggleFavoriteResult =
  | { status: "success"; isFavorite: boolean }
  | { status: "error"; code: "unauthenticated" | "unknown" };

export async function toggleFavoriteAction(
  locale: Locale,
  productId: string,
): Promise<ToggleFavoriteResult> {
  try {
    const session = await getSession();

    if (!session?.clientProfile) {
      return { status: "error", code: "unauthenticated" };
    }

    const supabase = await createClient();
    const clientId = session.clientProfile.id;

    // Check if favorite already exists
    const { data: existing, error: existingError } = await supabase
      .from("favorites")
      .select("id")
      .eq("client_id", clientId)
      .eq("product_id", productId)
      .maybeSingle();

    if (existingError) {
      console.error("Error checking favorite:", existingError);
      return { status: "error", code: "unknown" };
    }

    if (existing) {
      // Remove from favorites
      const { error: deleteError } = await supabase
        .from("favorites")
        .delete()
        .eq("id", existing.id);

      if (deleteError) {
        console.error("Error removing favorite:", deleteError);
        return { status: "error", code: "unknown" };
      }

      revalidatePath(`/${locale}/quick-order`);
      revalidatePath(`/${locale}/favorites`);

      return { status: "success", isFavorite: false };
    }

    // Add to favorites
    const { error: insertError } = await supabase.from("favorites").insert({
      client_id: clientId,
      product_id: productId,
    });

    if (insertError) {
      console.error("Error adding favorite:", insertError);
      return { status: "error", code: "unknown" };
    }

    revalidatePath(`/${locale}/quick-order`);
    revalidatePath(`/${locale}/favorites`);

    return { status: "success", isFavorite: true };
  } catch (error) {
    console.error("toggleFavoriteAction error:", error);
    return { status: "error", code: "unknown" };
  }
}


