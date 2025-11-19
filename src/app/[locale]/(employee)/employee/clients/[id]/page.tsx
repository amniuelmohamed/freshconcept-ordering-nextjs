import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Suspense } from "react";

import { getClientById } from "@/lib/data/clients";
import { getClientRoles } from "@/lib/data/client-roles";
import { requirePagePermission, hasPagePermission } from "@/lib/auth/page-permissions";
import { createClient } from "@/lib/supabase/server";
import type { LocalePageProps } from "@/types/next";
import type { Locale } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ClientForm } from "@/components/employee/client-form";
import { DeleteClientButton } from "@/components/employee/delete-client-button";
import { EmployeeFormSkeleton } from "@/components/ui/skeleton-cards";

type ClientDetailPageProps = LocalePageProps<{ id: string }>;

type TranslatedName = {
  fr?: string;
  nl?: string;
  en?: string;
};

function getRoleName(name: TranslatedName | null, locale: string): string {
  if (!name || typeof name !== "object") return "-";
  return (name[locale as keyof TranslatedName] as string) ?? name.fr ?? name.nl ?? name.en ?? "-";
}

function formatDate(dateString: string | null, locale: string): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "full",
  }).format(date);
}

function translateDeliveryDays(
  days: string[] | null,
  t: (key: string) => string,
): string {
  if (!days || days.length === 0) return "-";

  const dayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const dayMap: Record<string, string> = {
    monday: "form.deliveryDays.monday",
    tuesday: "form.deliveryDays.tuesday",
    wednesday: "form.deliveryDays.wednesday",
    thursday: "form.deliveryDays.thursday",
    friday: "form.deliveryDays.friday",
    saturday: "form.deliveryDays.saturday",
    sunday: "form.deliveryDays.sunday",
  };

  const sortedDays = [...days].sort((a, b) => {
    const aIndex = dayOrder.indexOf(a.toLowerCase());
    const bIndex = dayOrder.indexOf(b.toLowerCase());
    return aIndex - bIndex;
  });

  return sortedDays
    .map((day) => {
      const normalized = day.toLowerCase();
      return dayMap[normalized] ? t(dayMap[normalized]) : day;
    })
    .join(", ");
}

async function ClientDetailContent({
  locale,
  id,
}: {
  locale: Locale;
  id: string;
}) {
  const t = await getTranslations({
    locale,
    namespace: "employeeClients",
  });

  const supabase = await createClient();
  
  const [client, rolesData, canManageClients, orderCountResult] = await Promise.all([
    getClientById(id),
    getClientRoles(),
    hasPagePermission("manage_clients"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("client_id", id),
  ]);

  if (!client) {
    notFound();
  }

  const orderCount = orderCountResult.count ?? 0;

  // Transform roles to match ClientForm expected type
  const roles = rolesData.map((role) => ({
    id: role.id,
    name: role.name as { fr?: string; nl?: string; en?: string } | null,
    slug: role.slug,
    default_delivery_days: role.default_delivery_days,
  }));

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {client.company_name ?? client.contact_name ?? t("detail.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {client.contact_email}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/${locale}/employee/clients`}>
            {t("backToList")}
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {canManageClients ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("edit.title")}</CardTitle>
              <CardDescription>{t("edit.subtitle")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ClientForm
                locale={locale}
                roles={roles}
                client={{
                  id: client.id,
                  company_name: client.company_name,
                  contact_name: client.contact_name,
                  contact_email: client.contact_email,
                  contact_phone: client.contact_phone,
                  contact_mobile: client.contact_mobile,
                  client_role_id: client.client_role_id,
                  remise: client.remise,
                  delivery_days: client.delivery_days,
                  preferred_locale: client.preferred_locale,
                  tva_number: client.tva_number,
                  billing_address: client.billing_address as { street?: string; city?: string; postalCode?: string; country?: string } | null,
                  shipping_address: client.shipping_address as { street?: string; city?: string; postalCode?: string; country?: string } | null,
                }}
              />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{t("detail.title")}</CardTitle>
              <CardDescription>{t("detail.subtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-sm">
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("form.companyName.label")}
                  </p>
                  <p className="text-foreground">{client.company_name ?? "-"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("form.contactName.label")}
                  </p>
                  <p className="text-foreground">{client.contact_name ?? "-"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("form.email.label")}
                  </p>
                  <p className="text-foreground">{client.contact_email ?? "-"}</p>
                </div>
                {client.contact_phone && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      {t("form.contactPhone.label")}
                    </p>
                    <p className="text-foreground">{client.contact_phone}</p>
                  </div>
                )}
                {client.contact_mobile && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      {t("form.contactMobile.label")}
                    </p>
                    <p className="text-foreground">{client.contact_mobile}</p>
                  </div>
                )}
                {client.tva_number && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      {t("form.tvaNumber.label")}
                    </p>
                    <p className="text-foreground">{client.tva_number}</p>
                  </div>
                )}
                {client.preferred_locale && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      {t("form.preferredLocale.label")}
                    </p>
                    <p className="text-foreground">
                      {client.preferred_locale === "fr" ? "Français" :
                       client.preferred_locale === "nl" ? "Nederlands" :
                       client.preferred_locale === "en" ? "English" :
                       client.preferred_locale}
                    </p>
                  </div>
                )}
              </div>

              {client.shipping_address && typeof client.shipping_address === "object" && (
                <div className="border-t pt-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    {t("form.shippingAddress.title")}
                  </p>
                  <div className="space-y-2">
                    {(client.shipping_address as { street?: string }).street && (
                      <p className="text-foreground">
                        {(client.shipping_address as { street?: string }).street}
                      </p>
                    )}
                    <div className="flex gap-2">
                      {(client.shipping_address as { postalCode?: string }).postalCode && (
                        <p className="text-foreground">
                          {(client.shipping_address as { postalCode?: string }).postalCode}
                        </p>
                      )}
                      {(client.shipping_address as { city?: string }).city && (
                        <p className="text-foreground">
                          {(client.shipping_address as { city?: string }).city}
                        </p>
                      )}
                    </div>
                    {(client.shipping_address as { country?: string }).country && (
                      <p className="text-foreground">
                        {(client.shipping_address as { country?: string }).country}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {client.billing_address && typeof client.billing_address === "object" && (
                <div className="border-t pt-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    {t("form.billingAddress.title")}
                  </p>
                  <div className="space-y-2">
                    {(client.billing_address as { street?: string }).street && (
                      <p className="text-foreground">
                        {(client.billing_address as { street?: string }).street}
                      </p>
                    )}
                    <div className="flex gap-2">
                      {(client.billing_address as { postalCode?: string }).postalCode && (
                        <p className="text-foreground">
                          {(client.billing_address as { postalCode?: string }).postalCode}
                        </p>
                      )}
                      {(client.billing_address as { city?: string }).city && (
                        <p className="text-foreground">
                          {(client.billing_address as { city?: string }).city}
                        </p>
                      )}
                    </div>
                    {(client.billing_address as { country?: string }).country && (
                      <p className="text-foreground">
                        {(client.billing_address as { country?: string }).country}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="space-y-6">
          {canManageClients && (
            <Card>
              <CardHeader>
                <CardTitle>{t("delete.title")}</CardTitle>
                <CardDescription>{t("delete.subtitle")}</CardDescription>
              </CardHeader>
              <CardContent>
                <DeleteClientButton
                  locale={locale}
                  clientId={client.id}
                  clientName={client.company_name ?? client.contact_name ?? client.contact_email ?? ""}
                  orderCount={orderCount}
                />
              </CardContent>
            </Card>
          )}
          
          <Card>
            <CardHeader>
              <CardTitle>{t("detail.info.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  {t("detail.info.created")}
                </p>
                <p className="text-foreground">
                  {formatDate(client.created_at, locale)}
                </p>
              </div>
              {client.client_roles ? (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("detail.info.role")}
                  </p>
                  <p className="text-foreground">
                    {getRoleName(client.client_roles.name as TranslatedName, locale)}
                  </p>
                </div>
              ) : null}
              {client.delivery_days && client.delivery_days.length > 0 ? (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("detail.info.deliveryDays")}
                  </p>
                  <p className="text-foreground">
                    {translateDeliveryDays(client.delivery_days, t)}
                  </p>
                </div>
              ) : null}
              {client.remise !== null ? (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("detail.info.remise")}
                  </p>
                  <p className="text-foreground">{client.remise}%</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default async function EmployeeClientDetailPage({
  params,
}: ClientDetailPageProps) {
  const { locale, id } = await params;
  await requirePagePermission(locale, ["view_clients", "manage_clients"]);

  return (
    <Suspense fallback={<EmployeeFormSkeleton />}>
      <ClientDetailContent locale={locale} id={id} />
    </Suspense>
  );
}
