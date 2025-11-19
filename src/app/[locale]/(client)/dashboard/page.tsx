import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Calendar, DollarSign, ArrowRight, Edit } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { LocalePageProps } from "@/types/next";
import type { Locale } from "@/i18n/routing";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  getClientDashboardStats,
  getClientRecentOrders,
  getClientFavoriteProducts,
} from "@/lib/data/client-dashboard";
import { getNextDeliveryDate } from "@/lib/utils/delivery";
import { getCutoffSettings } from "@/lib/data/settings";
import { formatPrice } from "@/lib/utils/pricing";
import { OrderStatusBadge } from "@/components/client/order-status-badge";
import { DashboardSkeleton } from "@/components/ui/skeleton-cards";
import { KPICardWithChart } from "@/components/ui/kpi-card-with-chart";
import { getSparklineData, calculateTrend } from "@/lib/data/dashboard-stats";

async function DashboardContent({ locale }: { locale: Locale }) {
  const session = await getSession();

  if (!session?.clientProfile) {
    redirect(`/${locale}/login`);
  }

  const t = await getTranslations({
    locale,
    namespace: "clientDashboard",
  });

  // Fetch client data
  const supabase = await createClient();
  const { data: client } = await supabase
    .from("clients")
    .select("delivery_days, client_role_id")
    .eq("id", session.clientProfile.id)
    .single();

  let deliveryDays = client?.delivery_days ?? [];

  // If client doesn't have custom delivery_days, fetch from client_role
  if (deliveryDays.length === 0 && client?.client_role_id) {
    const { data: role } = await supabase
      .from("client_roles")
      .select("default_delivery_days")
      .eq("id", client.client_role_id)
      .single();

    if (role?.default_delivery_days) {
      deliveryDays = role.default_delivery_days;
    }
  }

  // Calculate next delivery date
  let nextDeliveryFormatted = t("noDeliveryDays");
  if (deliveryDays.length > 0) {
    try {
      const cutoffSettings = await getCutoffSettings();
      const nextDelivery = getNextDeliveryDate({
        deliveryDays,
        cutoffTime: cutoffSettings.cutoffTime,
        cutoffDayOffset: cutoffSettings.cutoffDayOffset,
      });

      nextDeliveryFormatted = new Intl.DateTimeFormat(locale, {
        dateStyle: "full",
      }).format(nextDelivery);
    } catch (error) {
      console.error("Error calculating next delivery:", error);
    }
  }

  // Fetch dashboard data
  const [stats, recentOrders, favoriteProducts, sparklineData, trends] = await Promise.all([
    getClientDashboardStats(session.clientProfile.id),
    getClientRecentOrders(session.clientProfile.id),
    getClientFavoriteProducts(session.clientProfile.id),
    getSparklineData(session.clientProfile.id),
    calculateTrend(session.clientProfile.id),
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{new Date().toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      {/* 🔥 CRITICAL INFO - Next Delivery (Large Card) */}
      <Card className="border-l-4 border-l-primary bg-gradient-to-br from-primary/5 to-background">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="flex-shrink-0">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-8 w-8 text-primary" />
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  {t("nextDelivery")}
                </p>
                <p className="text-3xl font-bold text-foreground">
                  {nextDeliveryFormatted}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("deliveriesNote")}
                </p>
              </div>
            </div>
            {!stats.pendingOrder && (
              <div className="w-full md:w-auto">
                <Button asChild className="w-full md:w-auto">
                  <Link href={`/${locale}/quick-order`}>
                    {t("orderNow")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pending Order Alert (if exists) */}
      {stats.pendingOrder && (
        <Card className="border-l-4 border-l-primary/80 bg-gradient-to-br from-primary/5 to-background">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="space-y-2 flex-1">
                <p className="text-sm font-medium text-muted-foreground">
                  {t("pendingOrder")}
                </p>
                <p className="text-3xl font-bold text-foreground">
                  {formatPrice(stats.pendingOrder.estimated_total || 0, locale, "EUR")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("pendingOrderInProgress")}
                </p>
              </div>
              <div className="w-full md:w-auto flex gap-2">
                <Button asChild variant="outline" className="flex-1 md:flex-none">
                  <Link href={`/${locale}/orders/${stats.pendingOrder.id}`}>
                    {t("view")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild className="flex-1 md:flex-none">
                  <Link href={`/${locale}/checkout`}>
                    {t("modifyOrder")}
                    <Edit className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats KPIs */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="h-1 w-12 rounded-full bg-gradient-to-r from-primary to-primary/60"></div>
          <h2 className="text-xl font-semibold text-foreground">
            {t("quickStats")}
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <KPICardWithChart
            title={t("favoriteProducts")}
            value={stats.favoritesCount}
            iconName="Heart"
            colorClass="border-l-secondary"
            delay={0}
          />

          <KPICardWithChart
            title={t("monthOrders")}
            value={stats.monthOrdersCount}
            iconName="TrendingUp"
            trend={{
              value: trends.ordersChangePercent,
              isPositive: trends.ordersChangePercent > 0,
            }}
            sparklineData={sparklineData}
            colorClass="border-l-primary"
            delay={0.1}
          />

          <Card className="border-l-4 border-l-primary/60 hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("monthTotal")}
                </CardTitle>
                <DollarSign className="h-4 w-4 text-primary/60" />
              </div>
              <CardDescription className="text-foreground text-xl font-bold pt-2 text-primary">
                {formatPrice(
                  recentOrders.reduce((sum, order) => sum + Number(order.estimated_total || 0), 0),
                  locale,
                  "EUR"
                )}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* Recent Orders Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="h-1 w-12 rounded-full bg-gradient-to-r from-primary to-primary/60"></div>
          <h2 className="text-xl font-semibold text-foreground">
            {t("recentOrdersTitle")}
          </h2>
        </div>
        <Card className="border-t-4 border-t-primary hover:shadow-xl transition-all duration-300">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardDescription>{t("recentOrdersDescription")}</CardDescription>
              <Button asChild variant="outline" size="sm" className="hover:bg-primary hover:text-primary-foreground transition-colors">
                <Link href={`/${locale}/orders`}>{t("viewAllOrders")}</Link>
              </Button>
            </div>
          </CardHeader>
        <CardContent>
          {recentOrders.length > 0 ? (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="group flex items-center justify-between rounded-lg border border-border p-4 hover:border-primary/50 hover:bg-muted/30 transition-all duration-200"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium group-hover:text-primary transition-colors">
                      {t("orderNumber", { id: order.id.slice(0, 8) })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.created_at
                        ? new Intl.DateTimeFormat(locale, {
                            dateStyle: "medium",
                          }).format(new Date(order.created_at))
                        : "-"}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right space-y-1">
                      <p className="text-sm font-semibold">
                        {formatPrice(order.estimated_total || 0, locale, "EUR")}
                      </p>
                      <div className="flex justify-end">
                        <OrderStatusBadge status={order.status || "pending"} />
                      </div>
                    </div>
                    <Button asChild variant="ghost" size="sm" className="hover:bg-primary hover:text-primary-foreground transition-colors">
                      <Link href={`/${locale}/orders/${order.id}`}>
                        {t("view")}
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 rounded-full bg-muted p-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <p className="mb-2 text-sm font-medium text-foreground">
                {t("noRecentOrders")}
              </p>
              <p className="mb-4 text-sm text-muted-foreground">
                {t("noRecentOrdersHelper")}
              </p>
              <Button asChild size="sm">
                <Link href={`/${locale}/quick-order`}>{t("noRecentOrdersAction")}</Link>
              </Button>
            </div>
          )}
        </CardContent>
        </Card>
      </div>

      {/* Favorite Products Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="h-1 w-12 rounded-full bg-gradient-to-r from-primary to-primary/60"></div>
          <h2 className="text-xl font-semibold text-foreground">
            {t("favoriteProductsTitle")}
          </h2>
        </div>
        <Card className="border-t-4 border-t-secondary hover:shadow-xl transition-all duration-300">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardDescription>
                {t("favoriteProductsDescription")}
              </CardDescription>
              <Button asChild variant="outline" size="sm" className="hover:bg-secondary hover:text-secondary-foreground transition-colors">
                <Link href={`/${locale}/favorites`}>{t("viewAllFavorites")}</Link>
              </Button>
            </div>
          </CardHeader>
        <CardContent>
          {favoriteProducts.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {favoriteProducts.map((product) => (
                <div
                  key={product.id}
                  className="group rounded-lg border border-border p-4 space-y-2 hover:border-secondary/50 hover:shadow-md hover:-translate-y-1 transition-all duration-300"
                >
                  <p className="text-sm font-medium line-clamp-2 group-hover:text-secondary transition-colors">
                    {typeof product.name === "object"
                      ? (product.name as Record<string, string>)[locale] || product.sku
                      : product.sku}
                  </p>
                  <p className="text-xs text-muted-foreground">{product.sku}</p>
                  <p className="text-sm font-semibold">
                    {formatPrice(product.price, locale, "EUR")}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 rounded-full bg-muted p-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </div>
              <p className="mb-2 text-sm font-medium text-foreground">
                {t("noFavoriteProducts")}
              </p>
              <p className="mb-4 text-sm text-muted-foreground">
                {t("noFavoriteProductsHelper")}
              </p>
              <Button asChild size="sm" variant="outline">
                <Link href={`/${locale}/quick-order`}>{t("noFavoriteProductsAction")}</Link>
              </Button>
            </div>
          )}
        </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default async function ClientDashboardPage({
  params,
}: LocalePageProps) {
  const { locale } = await params;

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent locale={locale} />
    </Suspense>
  );
}
