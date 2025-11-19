import { Suspense } from "react";
import {
  ChartCard,
  OrdersLineChart,
  RevenueAreaChart,
  CategoryPieChart,
} from "@/components/ui/charts";
import {
  getOrdersChartData,
  getCategoryDistribution,
} from "@/lib/data/dashboard-stats";
import { Skeleton } from "@/components/ui/skeleton";

function ChartSkeleton() {
  return <Skeleton className="h-[300px] w-full" />;
}

interface ClientDashboardChartsProps {
  clientId: string;
}

async function OrdersChart({ clientId }: ClientDashboardChartsProps) {
  const data = await getOrdersChartData(clientId);
  return (
    <ChartCard
      title="Mes commandes (14 derniers jours)"
      description="Évolution de vos commandes"
    >
      {data.length > 0 ? (
        <OrdersLineChart data={data} />
      ) : (
        <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
          Aucune commande récente
        </div>
      )}
    </ChartCard>
  );
}

async function SpendingChart({ clientId }: ClientDashboardChartsProps) {
  const data = await getOrdersChartData(clientId);
  return (
    <ChartCard
      title="Mes dépenses (14 derniers jours)"
      description="Évolution de vos dépenses"
    >
      {data.length > 0 ? (
        <RevenueAreaChart data={data} />
      ) : (
        <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
          Aucune donnée disponible
        </div>
      )}
    </ChartCard>
  );
}

async function CategoryChart({ clientId }: ClientDashboardChartsProps) {
  const data = await getCategoryDistribution(clientId);
  return (
    <ChartCard
      title="Mes catégories préférées"
      description="Distribution de vos achats par catégorie"
    >
      {data.length > 0 ? (
        <CategoryPieChart data={data} />
      ) : (
        <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
          Aucune donnée disponible
        </div>
      )}
    </ChartCard>
  );
}

export function ClientDashboardCharts({ clientId }: ClientDashboardChartsProps) {
  return (
    <div className="space-y-6 mt-8">
      <h2 className="text-lg font-semibold text-foreground">Mes Statistiques</h2>
      <div className="grid gap-6 md:grid-cols-2">
        <Suspense fallback={<ChartSkeleton />}>
          <OrdersChart clientId={clientId} />
        </Suspense>
        <Suspense fallback={<ChartSkeleton />}>
          <SpendingChart clientId={clientId} />
        </Suspense>
      </div>
      <div className="grid gap-6">
        <Suspense fallback={<ChartSkeleton />}>
          <CategoryChart clientId={clientId} />
        </Suspense>
      </div>
    </div>
  );
}

