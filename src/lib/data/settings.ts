import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import {
  DEFAULT_AVAILABLE_LOCALES,
  DEFAULT_AVAILABLE_PERMISSIONS,
  DEFAULT_AVAILABLE_UNITS,
} from "./settings-constants";

type SettingsRow = Database["public"]["Tables"]["settings"]["Row"];

const DEFAULT_CUTOFF_TIME = "08:00";
const DEFAULT_CUTOFF_DAY_OFFSET = 1;
const DEFAULT_LOCALE = "fr";
const DEFAULT_VAT_RATE = 6; // 6% VAT

export type CutoffSettings = {
  cutoffTime: string;
  cutoffDayOffset: number;
};

export const getCutoffSettings = cache(
  async (): Promise<CutoffSettings> => {
    const supabase = await createClient();

    const [cutoffTimeResult, cutoffOffsetResult] = await Promise.all([
      supabase
        .from("settings")
        .select("value")
        .eq("key", "order_cutoff_time")
        .maybeSingle<Pick<SettingsRow, "value">>(),
      supabase
        .from("settings")
        .select("value")
        .eq("key", "order_cutoff_day_offset")
        .maybeSingle<Pick<SettingsRow, "value">>(),
    ]);

    const cutoffTime =
      typeof cutoffTimeResult.data?.value === "string"
        ? cutoffTimeResult.data.value
        : DEFAULT_CUTOFF_TIME;

    const cutoffDayOffset =
      typeof cutoffOffsetResult.data?.value === "number"
        ? cutoffOffsetResult.data.value
        : typeof cutoffOffsetResult.data?.value === "string"
        ? Number(cutoffOffsetResult.data.value)
        : DEFAULT_CUTOFF_DAY_OFFSET;

    return {
      cutoffTime,
      cutoffDayOffset: Number.isFinite(cutoffDayOffset)
        ? cutoffDayOffset
        : DEFAULT_CUTOFF_DAY_OFFSET,
    };
  },
);

/**
 * Fetches available employee permissions from settings table.
 * Returns an object with permission keys and boolean values.
 * Falls back to default permissions (all true) if not configured.
 */
export const getAvailablePermissions = cache(async (): Promise<Record<string, boolean>> => {
  const supabase = await createClient();

  const { data: settingsResult } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "available_permissions")
    .maybeSingle<Pick<SettingsRow, "value">>();

  if (settingsResult?.value && typeof settingsResult.value === "object" && !Array.isArray(settingsResult.value)) {
    const permissionsObj = settingsResult.value as Record<string, boolean>;
    // Merge with defaults to ensure all permissions are present
    const result: Record<string, boolean> = {};
    DEFAULT_AVAILABLE_PERMISSIONS.forEach((perm) => {
      result[perm] = permissionsObj[perm] ?? true;
    });
    return result;
  }

  // Default: all permissions enabled
  const result: Record<string, boolean> = {};
  DEFAULT_AVAILABLE_PERMISSIONS.forEach((perm) => {
    result[perm] = true;
  });
  return result;
});

/**
 * Fetches available permissions as an array (for backward compatibility).
 * Only returns permissions that are enabled (true).
 */
export const getAvailablePermissionsArray = cache(async (): Promise<string[]> => {
  const permissions = await getAvailablePermissions();
  return Object.entries(permissions)
    .filter(([, enabled]) => enabled === true)
    .map(([key]) => key);
});

/**
 * Fetches available units from settings table.
 * Returns an object with unit keys and boolean values.
 * Falls back to default units (all true) if not configured.
 *
 * Note: Do NOT cache this so changes in the settings page take effect immediately.
 */
export async function getAvailableUnits(): Promise<Record<string, boolean>> {
  const supabase = await createClient();

  const { data: settingsResult } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "available_units")
    .maybeSingle<Pick<SettingsRow, "value">>();

  if (settingsResult?.value && typeof settingsResult.value === "object" && !Array.isArray(settingsResult.value)) {
    const unitsObj = settingsResult.value as Record<string, boolean>;
    // Merge with defaults to ensure all units are present
    const result: Record<string, boolean> = {};
    DEFAULT_AVAILABLE_UNITS.forEach((unit) => {
      result[unit] = unitsObj[unit] ?? true;
    });
    return result;
  }

  // Default: all units enabled
  const result: Record<string, boolean> = {};
  DEFAULT_AVAILABLE_UNITS.forEach((unit) => {
    result[unit] = true;
  });
  return result;
}

/**
 * Fetches available units as an array (for backward compatibility).
 * Only returns units that are enabled (true).
 */
export async function getAvailableUnitsArray(): Promise<string[]> {
  const units = await getAvailableUnits();
  return Object.entries(units)
    .filter(([, enabled]) => enabled === true)
    .map(([key]) => key);
}

/**
 * Fetches available locales from settings table.
 * Returns an object with locale keys and boolean values.
 * Falls back to default locales (all true) if not configured.
 *
 * Note: Do NOT cache this so changes in the settings page take effect immediately.
 */
export async function getAvailableLocales(): Promise<Record<string, boolean>> {
  const supabase = await createClient();

  const { data: settingsResult } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "available_locales")
    .maybeSingle<Pick<SettingsRow, "value">>();

  if (settingsResult?.value && typeof settingsResult.value === "object" && !Array.isArray(settingsResult.value)) {
    const localesObj = settingsResult.value as Record<string, boolean>;
    // Merge with defaults to ensure all locales are present
    const result: Record<string, boolean> = {};
    DEFAULT_AVAILABLE_LOCALES.forEach((loc) => {
      result[loc] = localesObj[loc] ?? true;
    });
    return result;
  }

  // Default: all locales enabled
  const result: Record<string, boolean> = {};
  DEFAULT_AVAILABLE_LOCALES.forEach((loc) => {
    result[loc] = true;
  });
  return result;
}

/**
 * Fetches available locales as an array (for backward compatibility).
 * Only returns locales that are enabled (true).
 */
export async function getAvailableLocalesArray(): Promise<string[]> {
  const locales = await getAvailableLocales();
  return Object.entries(locales)
    .filter(([, enabled]) => enabled === true)
    .map(([key]) => key);
}

/**
 * Fetches default locale from settings table.
 * Falls back to default locale if not configured.
 *
 * Note: Do NOT cache this so changes in the settings page take effect immediately.
 */
export async function getDefaultLocale(): Promise<string> {
  const supabase = await createClient();

  const { data: settingsResult } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "default_locale")
    .maybeSingle<Pick<SettingsRow, "value">>();

  if (settingsResult?.value && typeof settingsResult.value === "string") {
    // Validate it's a valid locale
    if (["fr", "nl", "en"].includes(settingsResult.value)) {
      return settingsResult.value;
    }
  }

  return DEFAULT_LOCALE;
}

/**
 * Fetches VAT rate from settings table.
 * Falls back to default VAT rate if not configured.
 *
 * Note: Do NOT cache this so changes in the settings page take effect immediately.
 */
export async function getVatRate(): Promise<number> {
  const supabase = await createClient();

  const { data: settingsResult } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "vat_rate")
    .maybeSingle<Pick<SettingsRow, "value">>();

  if (settingsResult?.value) {
    const vatRate =
      typeof settingsResult.value === "number"
        ? settingsResult.value
        : typeof settingsResult.value === "string"
        ? Number(settingsResult.value)
        : DEFAULT_VAT_RATE;

    if (Number.isFinite(vatRate) && vatRate >= 0 && vatRate <= 100) {
      return vatRate;
    }
  }

  return DEFAULT_VAT_RATE;
}

/**
 * Fetches all settings for the settings page.
 */
export const getAllSettings = cache(async () => {
  const supabase = await createClient();

  const { data: settings, error } = await supabase
    .from("settings")
    .select("*")
    .order("key");

  if (error) {
    console.error("Error fetching settings:", error);
    return {
      cutoffTime: DEFAULT_CUTOFF_TIME,
      cutoffDayOffset: DEFAULT_CUTOFF_DAY_OFFSET,
      defaultLocale: DEFAULT_LOCALE,
      vatRate: DEFAULT_VAT_RATE,
      availableLocales: (() => {
        const result: Record<string, boolean> = {};
        DEFAULT_AVAILABLE_LOCALES.forEach((loc) => {
          result[loc] = true;
        });
        return result;
      })(),
      availablePermissions: (() => {
        const result: Record<string, boolean> = {};
        DEFAULT_AVAILABLE_PERMISSIONS.forEach((perm) => {
          result[perm] = true;
        });
        return result;
      })(),
      availableUnits: (() => {
        const result: Record<string, boolean> = {};
        DEFAULT_AVAILABLE_UNITS.forEach((unit) => {
          result[unit] = true;
        });
        return result;
      })(),
    };
  }

  // Extract values from settings array
  const cutoffTimeSetting = settings?.find((s) => s.key === "order_cutoff_time");
  const cutoffOffsetSetting = settings?.find((s) => s.key === "order_cutoff_day_offset");
  const defaultLocaleSetting = settings?.find((s) => s.key === "default_locale");
  const vatRateSetting = settings?.find((s) => s.key === "vat_rate");
  const availableLocalesSetting = settings?.find((s) => s.key === "available_locales");
  const permissionsSetting = settings?.find((s) => s.key === "available_permissions");
  const availableUnitsSetting = settings?.find((s) => s.key === "available_units");

  const cutoffTime =
    typeof cutoffTimeSetting?.value === "string"
      ? cutoffTimeSetting.value
      : DEFAULT_CUTOFF_TIME;

  const cutoffDayOffset =
    typeof cutoffOffsetSetting?.value === "number"
      ? cutoffOffsetSetting.value
      : typeof cutoffOffsetSetting?.value === "string"
      ? Number(cutoffOffsetSetting.value)
      : DEFAULT_CUTOFF_DAY_OFFSET;

  const defaultLocale =
    typeof defaultLocaleSetting?.value === "string"
      ? defaultLocaleSetting.value
      : DEFAULT_LOCALE;

  const vatRate =
    typeof vatRateSetting?.value === "number"
      ? vatRateSetting.value
      : typeof vatRateSetting?.value === "string"
      ? Number(vatRateSetting.value)
      : DEFAULT_VAT_RATE;

  // Parse locales: object format only
  let availableLocales: Record<string, boolean>;
  if (availableLocalesSetting?.value && typeof availableLocalesSetting.value === "object" && !Array.isArray(availableLocalesSetting.value)) {
    const localesObj = availableLocalesSetting.value as Record<string, boolean>;
    availableLocales = {};
    DEFAULT_AVAILABLE_LOCALES.forEach((loc) => {
      availableLocales[loc] = localesObj[loc] ?? true;
    });
  } else {
    // Default: all enabled
    availableLocales = {};
    DEFAULT_AVAILABLE_LOCALES.forEach((loc) => {
      availableLocales[loc] = true;
    });
  }

  // Parse permissions: object format only
  let availablePermissions: Record<string, boolean>;
  if (permissionsSetting?.value && typeof permissionsSetting.value === "object" && !Array.isArray(permissionsSetting.value)) {
    const permissionsObj = permissionsSetting.value as Record<string, boolean>;
    availablePermissions = {};
    DEFAULT_AVAILABLE_PERMISSIONS.forEach((perm) => {
      availablePermissions[perm] = permissionsObj[perm] ?? true;
    });
  } else {
    // Default: all enabled
    availablePermissions = {};
    DEFAULT_AVAILABLE_PERMISSIONS.forEach((perm) => {
      availablePermissions[perm] = true;
    });
  }

  // Parse units: object format only
  let availableUnits: Record<string, boolean>;
  if (availableUnitsSetting?.value && typeof availableUnitsSetting.value === "object" && !Array.isArray(availableUnitsSetting.value)) {
    const unitsObj = availableUnitsSetting.value as Record<string, boolean>;
    availableUnits = {};
    DEFAULT_AVAILABLE_UNITS.forEach((unit) => {
      availableUnits[unit] = unitsObj[unit] ?? true;
    });
  } else {
    // Default: all enabled
    availableUnits = {};
    DEFAULT_AVAILABLE_UNITS.forEach((unit) => {
      availableUnits[unit] = true;
    });
  }

  return {
    cutoffTime,
    cutoffDayOffset: Number.isFinite(cutoffDayOffset) ? cutoffDayOffset : DEFAULT_CUTOFF_DAY_OFFSET,
    defaultLocale: defaultLocale || DEFAULT_LOCALE,
    vatRate: Number.isFinite(vatRate) ? vatRate : DEFAULT_VAT_RATE,
    availableLocales,
    availablePermissions,
    availableUnits,
  };
});
