import { Suspense } from "react";
import {
  ChartCard,
  CategoryPieChart,
  StatusBarChart,
} from "@/components/ui/charts";
import {
  getCategoryDistribution,
  getStatusDistribution,
} from "@/lib/data/dashboard-stats";
import { Skeleton } from "@/components/ui/skeleton";

function ChartSkeleton() {
  return <Skeleton className="h-[300px] w-full" />;
}

interface CategoryChartProps {
  title: string;
  description: string;
  noDataText: string;
}

async function CategoryChart({ title, description, noDataText }: CategoryChartProps) {
  const data = await getCategoryDistribution();
  return (
    <ChartCard
      title={title}
      description={description}
    >
      {data.length > 0 ? (
        <CategoryPieChart data={data} />
      ) : (
        <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
          {noDataText}
        </div>
      )}
    </ChartCard>
  );
}

interface StatusChartProps {
  title: string;
  description: string;
  noDataText: string;
  statusLabels: Record<string, string>;
  countLabel: string;
}

async function StatusChart({ title, description, noDataText, statusLabels, countLabel }: StatusChartProps) {
  const data = await getStatusDistribution();
  return (
    <ChartCard
      title={title}
      description={description}
    >
      {data.length > 0 ? (
        <StatusBarChart data={data} statusLabels={statusLabels} countLabel={countLabel} />
      ) : (
        <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
          {noDataText}
        </div>
      )}
    </ChartCard>
  );
}

interface EmployeeDashboardChartsProps {
  sectionTitle: string;
  categoryChartTitle: string;
  categoryChartDescription: string;
  statusChartTitle: string;
  statusChartDescription: string;
  noDataText: string;
  statusLabels: Record<string, string>;
  countLabel: string;
}

export function EmployeeDashboardCharts({
  sectionTitle,
  categoryChartTitle,
  categoryChartDescription,
  statusChartTitle,
  statusChartDescription,
  noDataText,
  statusLabels,
  countLabel,
}: EmployeeDashboardChartsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-1 w-12 rounded-full bg-gradient-to-r from-primary to-primary/60"></div>
        <h2 className="text-xl font-semibold text-foreground">{sectionTitle}</h2>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Suspense fallback={<ChartSkeleton />}>
          <CategoryChart
            title={categoryChartTitle}
            description={categoryChartDescription}
            noDataText={noDataText}
          />
        </Suspense>
        <Suspense fallback={<ChartSkeleton />}>
          <StatusChart
            title={statusChartTitle}
            description={statusChartDescription}
            noDataText={noDataText}
            statusLabels={statusLabels}
            countLabel={countLabel}
          />
        </Suspense>
      </div>
    </div>
  );
}

