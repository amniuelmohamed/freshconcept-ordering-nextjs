"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";

type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";

type OrderStatusBadgeProps = {
  status: string;
};

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const t = useTranslations("employeeOrders.status");

  const normalizedStatus = status.toLowerCase() as OrderStatus;

  // Get translated label
  const label = t(normalizedStatus);

  // Get Badge variant
  const getStatusVariant = (status: OrderStatus): "default" | "secondary" | "destructive" | "outline" => {
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
  };

  // Get custom Badge classes for colors
  const getStatusClass = (status: OrderStatus): string => {
    switch (status) {
      case "pending":
        return "border-yellow-500 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-950";
      case "confirmed":
        return "bg-blue-500 hover:bg-blue-600 text-white";
      case "shipped":
        return "bg-purple-500 hover:bg-purple-600 text-white";
      case "delivered":
        return "bg-green-500 hover:bg-green-600 text-white";
      case "cancelled":
        return "";
      default:
        return "";
    }
  };

  return (
    <Badge variant={getStatusVariant(normalizedStatus)} className={getStatusClass(normalizedStatus)}>
      {label}
    </Badge>
  );
}

