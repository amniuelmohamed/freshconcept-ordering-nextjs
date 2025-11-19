import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { DashboardShell } from "@/components/shared/dashboard-shell";
import { PageTransition } from "@/components/ui/page-transition";
import { getSession } from "@/lib/auth/session";
import { checkPermission } from "@/lib/auth/permissions";
import { isLocale } from "@/i18n/routing";
import { getAvailableLocalesArray } from "@/lib/data/settings";
import { redirect } from "next/navigation";
import type { LocalePageProps } from "@/types/next";

type EmployeeLayoutProps = LocalePageProps & {
  children: ReactNode;
};

export default async function EmployeeLayout({
  children,
  params,
}: EmployeeLayoutProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  // Use getSession() instead of requireEmployee() - middleware already verified auth
  const session = await getSession();
  
  if (!session?.employeeProfile) {
    redirect(`/${locale}/login`);
  }
  const t = await getTranslations({
    locale,
    namespace: "navigation",
  });

  const availableLocales = await getAvailableLocalesArray();

  const basePath = `/${locale}/employee`;

  // Define all possible navigation items with their required permissions
  const allNavItems = [
    { 
      label: t("employee.dashboard"), 
      href: `${basePath}/dashboard`,
      permissions: [] as string[], // Dashboard is always visible
    },
    { 
      label: t("employee.orders"), 
      href: `${basePath}/orders`,
      permissions: ["view_orders", "manage_orders"], // Show if has view or manage orders
    },
    { 
      label: t("employee.clients"), 
      href: `${basePath}/clients`,
      permissions: ["view_clients", "manage_clients"], // Show if has view or manage clients
    },
    { 
      label: t("employee.clientRoles"), 
      href: `${basePath}/client-roles`,
      permissions: ["manage_client_roles"],
    },
    { 
      label: t("employee.products"), 
      href: `${basePath}/products`,
      permissions: ["view_products", "manage_products"], // Show if has view or manage products
    },
    { 
      label: t("employee.categories"), 
      href: `${basePath}/categories`,
      permissions: ["view_products", "manage_products"], // Categories are part of products
    },
    { 
      label: t("employee.employees"), 
      href: `${basePath}/employees`,
      permissions: ["manage_employees"],
    },
    { 
      label: t("employee.employeeRoles"), 
      href: `${basePath}/employee-roles`,
      permissions: ["manage_employee_roles"],
    },
    { 
      label: t("employee.settings"), 
      href: `${basePath}/settings`,
      permissions: ["manage_settings"],
    },
  ];

  // Filter navigation items based on permissions
  // Batch permission checks to avoid duplicate RPC calls
  const navItems = [];
  const uniquePermissions = new Set<string>();
  for (const item of allNavItems) {
    item.permissions.forEach(p => uniquePermissions.add(p));
  }

  // Check all unique permissions in parallel
  const permissionResults = new Map<string, boolean>();
  await Promise.all(
    Array.from(uniquePermissions).map(async (permission) => {
      const result = await checkPermission(permission);
      permissionResults.set(permission, result);
    })
  );

  // Build nav items using cached results
  for (const item of allNavItems) {
    // If no permissions required, always show
    if (item.permissions.length === 0) {
      navItems.push({ label: item.label, href: item.href });
      continue;
    }

    // Check if user has at least one of the required permissions using cached results
    const hasAccess = item.permissions.some(permission => 
      permissionResults.get(permission) === true
    );

    if (hasAccess) {
      navItems.push({ label: item.label, href: item.href });
    }
  }

  return (
    <DashboardShell
      navItems={navItems}
      user={{
        email: session.user.email,
        name: session.employeeProfile?.full_name ?? session.user.email,
      }}
      locale={locale}
      signOutLabel={t("common.signOut")}
      appName={t("common.appName")}
      availableLocales={availableLocales}
    >
      <PageTransition>{children}</PageTransition>
    </DashboardShell>
  );
}

