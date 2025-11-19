// Constants for settings - no server dependencies
// These can be safely imported in Client Components

export const DEFAULT_AVAILABLE_LOCALES = ["fr", "nl", "en"] as const;

export const DEFAULT_AVAILABLE_PERMISSIONS = [
  "manage_settings",
  "manage_client_roles",
  "manage_employee_roles",
  "view_clients",
  "manage_clients",
  "manage_employees",
  "manage_products",
  "view_products",
  "view_orders",
  "manage_orders",
] as const;

export const DEFAULT_AVAILABLE_UNITS = [
  "kg",
  "piece",
] as const;

