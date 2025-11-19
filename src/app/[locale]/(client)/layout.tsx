import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { DashboardShell } from "@/components/shared/dashboard-shell";
import { PageTransition } from "@/components/ui/page-transition";
import { getSession } from "@/lib/auth/session";
import { isLocale } from "@/i18n/routing";
import { getAvailableLocalesArray } from "@/lib/data/settings";
import { redirect } from "next/navigation";
import type { LocalePageProps } from "@/types/next";

type ClientLayoutProps = LocalePageProps & {
  children: ReactNode;
};

export default async function ClientLayout({
  children,
  params,
}: ClientLayoutProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  // Use getSession() instead of requireClient() - middleware already verified auth
  const session = await getSession();
  
  if (!session?.clientProfile) {
    redirect(`/${locale}/login`);
  }
  const t = await getTranslations({
    locale,
    namespace: "navigation",
  });

  const availableLocales = await getAvailableLocalesArray();

  const basePath = `/${locale}`;

  const navItems = [
    { label: t("client.dashboard"), href: `${basePath}/dashboard` },
    { label: t("client.quickOrder"), href: `${basePath}/quick-order` },
    { label: t("client.orders"), href: `${basePath}/orders` },
    { label: t("client.favorites"), href: `${basePath}/favorites` },
    { label: t("client.profile"), href: `${basePath}/profile` },
  ];

  return (
    <DashboardShell
      navItems={navItems}
      user={{
        email: session.user.email,
        name: session.clientProfile?.company_name ?? session.user.email,
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

