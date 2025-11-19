import { redirect } from "next/navigation";

import { getSession, resolvePreferredLocale } from "@/lib/auth/session";
import type { Locale } from "@/i18n/routing";

type LocalePageProps = {
  params: { locale: Locale };
};

export default async function LocaleLandingPage({
  params,
}: LocalePageProps) {
  const { locale } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/${locale}/login`);
  }

  if (session?.clientProfile) {
    const preferredLocale = resolvePreferredLocale(
      session.clientProfile.preferred_locale,
    );
    redirect(`/${preferredLocale}/dashboard`);
  }

  if (session?.employeeProfile) {
    redirect(`/${locale}/employee/dashboard`);
  }
  // Fallback in case the session unexpectedly doesn't match any profile.
  redirect(`/${locale}/login`);
}

