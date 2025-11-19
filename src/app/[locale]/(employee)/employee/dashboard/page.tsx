import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { LocalePageProps } from "@/types/next";
import type { Locale } from "@/i18n/routing";
import { getDashboardStats } from "@/lib/data/dashboard";
import { formatPrice } from "@/lib/utils/pricing";
import { getOrders } from "@/lib/data/orders";
import { EmployeeOrdersTable } from "@/components/employee/orders-table";
import { EmployeeDashboardSkeleton } from "@/components/ui/skeleton-cards";
import { EmployeeDashboardCharts } from "@/components/employee/dashboard-charts";
import { KPICardWithChart } from "@/components/ui/kpi-card-with-chart";
import { getSparklineData, calculateTrend } from "@/lib/data/dashboard-stats";

async function DashboardContent({ locale }: { locale: Locale }) {
  const t = await getTranslations({
    locale,
    namespace: "employeeDashboard",
  });

  const [stats, pendingOrders, sparklineData, trends] = await Promise.all([
    getDashboardStats(),
    getOrders({ status: "pending", limit: 10 }),
    getSparklineData(),
    calculateTrend(),
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

      {/* CRITICAL INFO - Pending Orders (Large Card) */}
      <Card className="border-l-4 border-l-primary bg-gradient-to-br from-primary/5 to-background">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="space-y-2 flex-1">
              <p className="text-sm font-medium text-muted-foreground">
                {t("ordersPending")}
              </p>
              <p className="text-5xl font-bold text-foreground">
                {stats.pendingOrders}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("ordersPendingNote")}
              </p>
            </div>
            <div className="hidden md:block">
              <div className="text-right space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  {t("pendingValue")}
                </p>
                <p className="text-3xl font-bold text-primary">
                  {formatPrice(stats.pendingOrdersValue, locale, "EUR")}
                </p>
              </div>
            </div>
            {stats.pendingOrders > 0 && (
              <div className="w-full md:w-auto">
                <Button asChild className="w-full md:w-auto">
                  <Link href={`/${locale}/employee/orders?status=pending`}>
                    {t("viewOrders")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pending Orders Table - Immediate Action Required */}
      {pendingOrders.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-1 w-12 rounded-full bg-gradient-to-r from-primary to-primary/60"></div>
            <h2 className="text-xl font-semibold text-foreground">
              {t("pendingOrdersList")}
            </h2>
          </div>
          <EmployeeOrdersTable
            locale={locale}
            orders={pendingOrders}
            showStatus={false}
            showActions={true}
          />
        </div>
      )}

      {/* Quick Stats KPIs */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="h-1 w-12 rounded-full bg-gradient-to-r from-primary to-primary/60"></div>
          <h2 className="text-xl font-semibold text-foreground">
            {t("quickStats")}
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KPICardWithChart
            title={t("ordersToday")}
            value={stats.ordersToday}
            iconName="Package"
            sparklineData={sparklineData}
            colorClass="border-l-primary"
            delay={0}
          />
          <KPICardWithChart
            title={t("clientsActive")}
            value={stats.activeClients}
            iconName="Users"
            colorClass="border-l-primary/70"
            delay={0.1}
          />
          <KPICardWithChart
            title={t("monthOrdersCount")}
            value={stats.monthOrdersCount}
            iconName="TrendingUp"
            trend={{
              value: trends.ordersChangePercent,
              isPositive: trends.ordersChangePercent > 0,
            }}
            colorClass="border-l-primary/80"
            delay={0.2}
          />
          <KPICardWithChart
            title={t("monthOrdersValue")}
            value={formatPrice(stats.monthOrdersValue, locale, "EUR")}
            iconName="DollarSign"
            trend={{
              value: trends.revenueChangePercent,
              isPositive: trends.revenueChangePercent > 0,
            }}
            sparklineData={sparklineData}
            colorClass="border-l-secondary"
            delay={0.3}
          />
        </div>
      </div>

      {/* Analytics Charts (Optional - Bottom) */}
      <EmployeeDashboardCharts
        sectionTitle={t("detailedAnalytics")}
        categoryChartTitle={t("charts.categoryTitle")}
        categoryChartDescription={t("charts.categoryDescription")}
        statusChartTitle={t("charts.statusTitle")}
        statusChartDescription={t("charts.statusDescription")}
        noDataText={t("charts.noData")}
        statusLabels={{
          pending: t("status.pending"),
          confirmed: t("status.confirmed"),
          shipped: t("status.shipped"),
          delivered: t("status.delivered"),
          cancelled: t("status.cancelled"),
        }}
        countLabel={t("charts.countLabel")}
      />
    </div>
  );
}

export default async function EmployeeDashboardPage({
  params,
}: LocalePageProps) {
  const { locale } = await params;

  return (
    <Suspense fallback={<EmployeeDashboardSkeleton />}>
      <DashboardContent locale={locale} />
    </Suspense>
  );
}

