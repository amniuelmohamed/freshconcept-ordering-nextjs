"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/routing";
import { requirePermission } from "@/lib/auth/permissions";
import type { TablesInsert } from "@/types/database";

const updateSettingsSchema = z.object({
  cutoffTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)"),
  cutoffDayOffset: z.number().int().min(0).max(7),
  defaultLocale: z.enum(["fr", "nl", "en"]),
  vatRate: z.number().min(0).max(100),
  availableLocales: z.record(z.string(), z.boolean()),
  availablePermissions: z.record(z.string(), z.boolean()),
  availableUnits: z.record(z.string(), z.boolean()),
});

export type UpdateSettingsResult =
  | { status: "success" }
  | { status: "error"; code: "validation-error" | "update-error" | "unauthorized" };

export async function updateSettingsAction(
  locale: Locale,
  formData: FormData,
): Promise<UpdateSettingsResult> {
  await requirePermission(locale, "manage_settings");

  const parsed = updateSettingsSchema.safeParse({
    cutoffTime: formData.get("cutoffTime"),
    cutoffDayOffset: formData.get("cutoffDayOffset")
      ? Number(formData.get("cutoffDayOffset"))
      : undefined,
    defaultLocale: formData.get("defaultLocale"),
    vatRate: formData.get("vatRate")
      ? Number(formData.get("vatRate"))
      : undefined,
    availableLocales: formData.get("availableLocales")
      ? JSON.parse(String(formData.get("availableLocales")))
      : undefined,
    availablePermissions: formData.get("availablePermissions")
      ? JSON.parse(String(formData.get("availablePermissions")))
      : undefined,
    availableUnits: formData.get("availableUnits")
      ? JSON.parse(String(formData.get("availableUnits")))
      : undefined,
  });

  if (!parsed.success) {
    return { status: "error", code: "validation-error" };
  }

  const supabase = await createClient();

  // Update or insert each setting using upsert
  const settingsToUpdate = [
    {
      key: "order_cutoff_time",
      value: parsed.data.cutoffTime,
      description: "Order cutoff time in HH:mm format",
    },
    {
      key: "order_cutoff_day_offset",
      value: parsed.data.cutoffDayOffset,
      description: "Number of days before delivery when orders must be placed",
    },
    {
      key: "default_locale",
      value: parsed.data.defaultLocale,
      description: "Default locale for the platform",
    },
    {
      key: "vat_rate",
      value: parsed.data.vatRate,
      description: "VAT rate in percentage (e.g., 21 for 21%)",
    },
    {
      key: "available_locales",
      value: parsed.data.availableLocales,
      description: "List of available locales for the platform",
    },
    {
      key: "available_permissions",
      value: parsed.data.availablePermissions,
      description: "List of available employee permissions",
    },
    {
      key: "available_units",
      value: parsed.data.availableUnits,
      description: "List of available product units",
    },
  ];

  // Use upsert to update or insert each setting
  for (const setting of settingsToUpdate) {
    // First, try to get existing setting
    const { data: existing } = await supabase
      .from("settings")
      .select("id")
      .eq("key", setting.key)
      .maybeSingle();

    if (existing?.id) {
      // Update existing
      const { error } = await supabase
        .from("settings")
        .update({
          value: setting.value,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) {
        console.error(`Error updating setting ${setting.key}:`, error);
        return { status: "error", code: "update-error" };
      }
    } else {
      // Insert new
      const insertData: TablesInsert<"settings"> = {
        key: setting.key,
        value: setting.value,
        description: setting.description,
      };
      const { error } = await supabase
        .from("settings")
        .insert(insertData);

      if (error) {
        console.error(`Error inserting setting ${setting.key}:`, error);
        return { status: "error", code: "update-error" };
      }
    }
  }

  revalidatePath(`/${locale}/employee/settings`);

  return { status: "success" };
}

