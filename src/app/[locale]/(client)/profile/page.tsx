import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { LocalePageProps } from "@/types/next";
import type { Locale } from "@/i18n/routing";
import { ProfileForm } from "@/components/client/profile-form";
import { PasswordForm } from "@/components/client/password-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProfileSkeleton } from "@/components/ui/skeleton-cards";

async function ProfileContent({ locale }: { locale: Locale }) {
  const session = await getSession();

  if (!session?.clientProfile) {
    redirect(`/${locale}/login`);
  }

  const t = await getTranslations({ locale, namespace: "clientProfile" });

  // Fetch full client data
  const supabase = await createClient();
  const { data: client } = await supabase
    .from("clients")
    .select("*, client_roles(name)")
    .eq("id", session.clientProfile.id)
    .single();

  if (!client) {
    redirect(`/${locale}/login`);
  }

  // Parse billing address from JSON
  const billingAddress = typeof client.billing_address === 'object' && client.billing_address !== null
    ? (client.billing_address as Record<string, string>)
    : {};
  const street = billingAddress.street ?? billingAddress.address ?? "";
  const city = billingAddress.city ?? "";
  const postalCode = billingAddress.postalCode ?? billingAddress.postal_code ?? "";
  const country = billingAddress.country ?? "";

  // Get delivery days (from client or from role)
  let deliveryDays = client.delivery_days ?? [];
  if (deliveryDays.length === 0 && client.client_role_id) {
    const { data: role } = await supabase
      .from("client_roles")
      .select("default_delivery_days")
      .eq("id", client.client_role_id)
      .single();

    if (role?.default_delivery_days) {
      deliveryDays = role.default_delivery_days;
    }
  }

  const dayNames: Record<string, string> = {
    monday: t("delivery.monday", { default: "Monday" }),
    tuesday: t("delivery.tuesday", { default: "Tuesday" }),
    wednesday: t("delivery.wednesday", { default: "Wednesday" }),
    thursday: t("delivery.thursday", { default: "Thursday" }),
    friday: t("delivery.friday", { default: "Friday" }),
    saturday: t("delivery.saturday", { default: "Saturday" }),
    sunday: t("delivery.sunday", { default: "Sunday" }),
  };

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle>{t("sections.info")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileForm
              initialData={{
                companyName: client.company_name ?? "",
                contactName: client.contact_name ?? "",
                contactEmail: client.contact_email ?? "",
                phone: client.contact_phone ?? "",
                mobile: client.contact_mobile ?? "",
                street,
                city,
                postalCode,
                country,
                preferredLocale: client.preferred_locale ?? "fr",
              }}
            />
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle>{t("sections.password")}</CardTitle>
            <CardDescription>{t("sections.passwordDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <PasswordForm />
          </CardContent>
        </Card>

        {/* Delivery Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("sections.delivery")}</CardTitle>
            <CardDescription>{t("delivery.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            {deliveryDays.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {deliveryDays.map((day) => (
                  <div
                    key={day}
                    className="rounded-md bg-primary/10 px-3 py-2 text-sm font-medium text-primary"
                  >
                    {dayNames[day.toLowerCase()] || day}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("delivery.noDays")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default async function ClientProfilePage({
  params,
}: LocalePageProps) {
  const { locale } = await params;

  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileContent locale={locale} />
    </Suspense>
  );
}
