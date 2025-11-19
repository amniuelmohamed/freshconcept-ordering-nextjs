import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/routing";
import { defaultLocale, isLocale } from "@/i18n/routing";

type ClientProfile = {
  id: string;
  company_name?: string | null;
  preferred_locale?: string | null;
  remise?: number | null;
  delivery_days?: string[] | null;
};

type EmployeeProfile = {
  id: string;
  full_name?: string | null;
};

type SessionResult = {
  user: {
    id: string;
    email?: string | null;
  };
  clientProfile: ClientProfile | null;
  employeeProfile: EmployeeProfile | null;
};

// Use getSession instead of getUser - it's less expensive and uses cached tokens
const fetchSession = cache(async (): Promise<SessionResult | null> => {
  const supabase = await createClient();

  // Use getSession instead of getUser - it reads from cookies/cache instead of making API call
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.user) {
    return null;
  }

  const user = session.user;

  const { data: clientProfile } = await supabase
    .from("clients")
    .select("id, company_name, preferred_locale, remise, delivery_days")
    .eq("id", user.id)
    .maybeSingle<ClientProfile>();

  const { data: employeeProfile } = await supabase
    .from("employees")
    .select("id, full_name")
    .eq("id", user.id)
    .maybeSingle<EmployeeProfile>();

  return {
    user: {
      id: user.id,
      email: user.email,
    },
    clientProfile: clientProfile ?? null,
    employeeProfile: employeeProfile ?? null,
  };
});

export async function getSession() {
  return fetchSession();
}

function resolveLocale(
  preferredLocale: string | null | undefined,
  fallback: Locale,
) {
  if (preferredLocale && isLocale(preferredLocale)) {
    return preferredLocale;
  }

  return fallback;
}

export async function requireClient(locale: Locale) {
  const session = await fetchSession();

  if (!session) {
    redirect(`/${locale}/login`);
  }

  if (session.employeeProfile && !session.clientProfile) {
    redirect(`/${locale}/employee/dashboard`);
  }

  if (!session.clientProfile) {
    redirect(`/${locale}/login`);
  }

  const effectiveLocale = resolveLocale(
    session.clientProfile.preferred_locale,
    locale,
  );

  return {
    ...session,
    locale: effectiveLocale,
  };
}

export async function requireEmployee(locale: Locale) {
  const session = await fetchSession();

  if (!session) {
    redirect(`/${locale}/login`);
  }

  if (session.clientProfile && !session.employeeProfile) {
    redirect(`/${locale}/dashboard`);
  }

  if (!session.employeeProfile) {
    redirect(`/${locale}/login`);
  }

  return {
    ...session,
    locale,
  };
}

export async function requireAnonymous(locale: Locale) {
  const session = await fetchSession();

  if (!session) {
    return;
  }

  if (session.clientProfile) {
    const nextLocale = resolveLocale(
      session.clientProfile.preferred_locale,
      locale,
    );

    redirect(`/${nextLocale}/dashboard`);
  }

  if (session.employeeProfile) {
    redirect(`/${locale}/employee/dashboard`);
  }
}

export function resolvePreferredLocale(locale?: string | null) {
  if (locale && isLocale(locale)) {
    return locale;
  }

  return defaultLocale;
}

