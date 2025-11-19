import Link from "next/link";
import { getTranslations } from "next-intl/server";

import type { OrderWithClient } from "@/lib/data/orders";
import { formatPrice } from "@/lib/utils/pricing";
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
import { Badge } from "@/components/ui/badge";

type OrdersTableProps = {
  locale: string;
  orders: OrderWithClient[];
  showStatus?: boolean;
  showActions?: boolean;
};

function formatDate(dateString: string | null, locale: string): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
  }).format(date);
}

function getStatusBadgeVariant(status: string | null): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "pending":
      return "outline";
    case "confirmed":
      return "default";
    case "shipped":
    case "delivered":
      return "default";
    case "cancelled":
      return "destructive";
    default:
      return "secondary";
  }
}

function getStatusBadgeClass(status: string | null): string {
  switch (status) {
    case "pending":
      return "border-yellow-500 text-yellow-700 dark:text-yellow-400";
    case "confirmed":
      return "bg-blue-500 hover:bg-blue-600";
    case "shipped":
      return "bg-purple-500 hover:bg-purple-600";
    case "delivered":
      return "bg-green-500 hover:bg-green-600";
    case "cancelled":
      return "";
    default:
      return "";
  }
}

export async function EmployeeOrdersTable({
  locale,
  orders,
  showStatus = true,
  showActions = true,
}: OrdersTableProps) {
  const t = await getTranslations({
    locale,
    namespace: "employeeOrders",
  });

  if (orders.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        {t("table.noOrders")}
      </div>
    );
  }

  return (
    <Card className="border-t-4 border-t-primary hover:shadow-lg transition-all duration-300">
      <CardContent className="p-0">
        <div className="rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.orderId")}</TableHead>
                <TableHead>{t("table.client")}</TableHead>
                <TableHead>{t("table.created")}</TableHead>
                <TableHead>{t("table.deliveryDate")}</TableHead>
                {showStatus && <TableHead>{t("table.status")}</TableHead>}
                <TableHead className="text-right">{t("table.estimatedTotal")}</TableHead>
                {showActions && <TableHead className="text-right">{t("table.actions")}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id} className="group hover:bg-muted/30 transition-colors duration-200">
                  <TableCell className="font-mono text-sm group-hover:text-primary transition-colors">
                    {order.id.slice(0, 8)}...
                  </TableCell>
                  <TableCell className="font-medium">
                    {order.clients?.company_name ?? order.clients?.contact_name ?? "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(order.created_at, locale)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(order.delivery_date, locale)}
                  </TableCell>
                  {showStatus && (
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(order.status)} className={getStatusBadgeClass(order.status)}>
                        {order.status
                          ? t(`status.${order.status}`)
                          : t("status.unknown")}
                      </Badge>
                    </TableCell>
                  )}
                  <TableCell className="text-right font-medium">
                    {order.estimated_total
                      ? formatPrice(order.estimated_total, locale, "EUR")
                      : "-"}
                  </TableCell>
                  {showActions && (
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm" className="hover:bg-primary hover:text-primary-foreground transition-colors">
                        <Link href={`/${locale}/employee/orders/${order.id}`}>
                          {t("table.view")}
                        </Link>
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}


