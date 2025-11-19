"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { defaultLocale } from "@/i18n/routing";

export async function signOutAction(currentLocale?: string) {
  const supabase = await createClient();

  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Error signing out:", error);
      // Still redirect even if signOut fails to ensure user is logged out client-side
    }
  } catch (error) {
    console.error("Unexpected error during sign out:", error);
    // Continue with redirect to ensure cleanup
  }

  redirect(`/${currentLocale ?? defaultLocale}/login`);
}

