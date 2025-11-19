import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { getClients } from "@/lib/data/clients";
import { getClientRoles } from "@/lib/data/client-roles";
import { requirePagePermission, hasPagePermission } from "@/lib/auth/page-permissions";
import type { LocalePageProps } from "@/types/next";
import type { Locale } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClientsFilters } from "@/components/employee/clients-filters";
import { EmployeeTableSkeleton } from "@/components/ui/skeleton-cards";

type TranslatedName = {
  fr?: string;
  nl?: string;
  en?: string;
};

function getRoleName(name: TranslatedName | null, locale: Locale): string {
  if (!name || typeof name !== "object") return "-";
  return (name[locale as keyof TranslatedName] as string) ?? name.fr ?? name.nl ?? name.en ?? "-";
}

function formatDate(dateString: string | null, locale: Locale): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
  }).format(date);
}

type ClientsPageProps = LocalePageProps & {
  searchParams: Promise<{ search?: string; role?: string }>;
};

async function ClientsContent({
  locale,
  search,
  role,
}: {
  locale: Locale;
  search?: string;
  role?: string;
}) {
  // Require view_clients or manage_clients permission
  await requirePagePermission(locale, ["view_clients", "manage_clients"]);
  const t = await getTranslations({
    locale,
    namespace: "employeeClients",
  });

  const [allClients, canManageClients, roles] = await Promise.all([
    getClients(),
    hasPagePermission("manage_clients"),
    getClientRoles(),
  ]);

  // Filter clients based on search query
  const filteredBySearch = search
    ? allClients.filter((client) => {
        const searchLower = search.toLowerCase();
        const companyName = (client.company_name ?? "").toLowerCase();
        const contactName = (client.contact_name ?? "").toLowerCase();
        const email = (client.contact_email ?? "").toLowerCase();
        const roleName = client.client_roles
          ? getRoleName(client.client_roles.name as TranslatedName, locale).toLowerCase()
          : "";
        return (
          companyName.includes(searchLower) ||
          contactName.includes(searchLower) ||
          email.includes(searchLower) ||
          roleName.includes(searchLower)
        );
      })
    : allClients;

  // Filter by role (slug) if selected
  const clients = role
    ? filteredBySearch.filter((client) => client.client_roles?.slug === role)
    : filteredBySearch;

  const roleOptions = roles.map((r) => ({
    id: r.id,
    slug: r.slug ?? "",
    label: getRoleName(r.name as TranslatedName | null, locale),
  }));

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        {canManageClients && (
          <Button asChild>
            <Link href={`/${locale}/employee/clients/new`}>
              {t("createNew")}
            </Link>
          </Button>
        )}
      </div>

      <ClientsFilters roles={roleOptions} />

      {clients.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {t("noClients")}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-t-4 border-t-primary hover:shadow-lg transition-all duration-300">
          <CardContent className="p-0">
            <div className="rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("table.company")}</TableHead>
                    <TableHead>{t("table.contact")}</TableHead>
                    <TableHead>{t("table.role")}</TableHead>
                    <TableHead>{t("table.email")}</TableHead>
                    <TableHead>{t("table.created")}</TableHead>
                    <TableHead className="text-right">{t("table.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow
                      key={client.id}
                      className="group hover:bg-muted/30 transition-colors duration-200"
                    >
                      <TableCell className="font-medium group-hover:text-primary transition-colors">
                        {client.company_name ?? "-"}
                      </TableCell>
                      <TableCell>
                        {client.contact_name ?? "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {client.client_roles
                          ? getRoleName(client.client_roles.name as TranslatedName, locale)
                          : "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {client.contact_email ?? "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(client.created_at, locale)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm" className="hover:bg-primary hover:text-primary-foreground transition-colors">
                          <Link href={`/${locale}/employee/clients/${client.id}`}>
                            {canManageClients ? t("table.edit") : t("table.view")}
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default async function EmployeeClientsPage({
  params,
  searchParams,
}: ClientsPageProps) {
  const { locale } = await params;
  const { search, role } = await searchParams;

  return (
    <Suspense fallback={<EmployeeTableSkeleton />}>
      <ClientsContent locale={locale} search={search} role={role} />
    </Suspense>
  );
}
