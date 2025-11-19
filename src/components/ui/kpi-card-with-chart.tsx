"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  ShoppingCart,
  Package,
  Users,
  DollarSign,
  Calendar,
  ShoppingBag,
  Heart,
  type LucideIcon,
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area } from "recharts";

// Map icon names to actual components
const iconMap: Record<string, LucideIcon> = {
  ShoppingCart,
  Package,
  Users,
  DollarSign,
  Calendar,
  TrendingUp,
  ShoppingBag,
  Heart,
};

interface KPICardWithChartProps {
  title: string;
  value: string | number;
  iconName: string; // Changed from icon: LucideIcon to iconName: string
  trend?: {
    value: number;
    isPositive: boolean;
  };
  sparklineData?: { value: number }[];
  colorClass?: string;
  delay?: number;
}

export function KPICardWithChart({
  title,
  value,
  iconName,
  trend,
  sparklineData,
  colorClass = "border-l-primary",
  delay = 0,
}: KPICardWithChartProps) {
  // Resolve the icon component from the name
  const Icon = iconMap[iconName] || ShoppingCart;
  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.isPositive) {
      return <TrendingUp className="h-4 w-4 text-primary" />;
    }
    if (trend.value < 0) {
      return <TrendingDown className="h-4 w-4 text-primary/60" />;
    }
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getTrendColor = () => {
    if (!trend) return "text-muted-foreground";
    return trend.isPositive ? "text-primary" : trend.value < 0 ? "text-primary/60" : "text-muted-foreground";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transition={{ delay } as any}
      whileHover={{ y: -4, scale: 1.02 }}
      className="cursor-default h-full"
    >
      <Card
        className={`group relative overflow-hidden ${colorClass} border-l-4 hover:shadow-lg transition-all duration-300 h-full`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <CardHeader className="relative pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {title}
            </CardTitle>
            <Icon className="h-4 w-4 text-primary/40" />
          </div>
        </CardHeader>

        <CardContent className="relative">
          <div className="flex items-end justify-between">
            <div className="space-y-1">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                transition={{ delay: delay + 0.2, duration: 0.5 } as any}
                className="text-2xl font-bold text-foreground"
              >
                {value}
              </motion.div>
              
              {trend && (
                <div className={`flex items-center gap-1 text-xs font-medium ${getTrendColor()}`}>
                  {getTrendIcon()}
                  <span>{Math.abs(trend.value)}%</span>
                </div>
              )}
            </div>

            {sparklineData && sparklineData.length > 0 && (
              <div className="h-12 w-24 min-w-[96px] min-h-[48px]">
                <ResponsiveContainer width={96} height={48}>
                  <AreaChart data={sparklineData}>
                    <defs>
                      <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor={trend?.isPositive ? "#004494" : "#3b82f6"}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor={trend?.isPositive ? "#004494" : "#3b82f6"}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={trend?.isPositive ? "#004494" : "#3b82f6"}
                      strokeWidth={2}
                      fill={`url(#gradient-${title})`}
                      isAnimationActive={true}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

