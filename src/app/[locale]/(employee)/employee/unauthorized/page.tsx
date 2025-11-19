import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { getSession } from "@/lib/auth/session";
import { isLocale } from "@/i18n/routing";
import type { LocalePageProps } from "@/types/next";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default async function UnauthorizedPage({ params }: LocalePageProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  // Ensure user is logged in as employee
  // Use getSession() instead of requireEmployee() since layout already verified auth
  const session = await getSession();
  if (!session?.employeeProfile) {
    redirect(`/${locale}/login`);
  }

  const t = await getTranslations({
    locale,
    namespace: "unauthorized",
  });

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <Alert variant="destructive" className="max-w-md">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t("title")}</AlertTitle>
        <AlertDescription className="mt-2">
          {t("description")}
        </AlertDescription>
      </Alert>
      <div className="mt-6">
        <Button asChild>
          <Link href={`/${locale}/employee/dashboard`}>
            {t("backToDashboard")}
          </Link>
        </Button>
      </div>
    </div>
  );
}

