"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Blue color palette - different shades of primary blue
const COLORS = ["#004494", "#1e5aa8", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe"];

// Custom tooltip component for better styling
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-3 shadow-lg">
        <p className="text-sm font-medium text-foreground mb-2">{label}</p>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-semibold text-foreground">
              {entry.name === "Revenu" || entry.name === "Revenue" 
                ? `€${entry.value.toFixed(2)}` 
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

interface ChartCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function ChartCard({ title, description, children }: ChartCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -4 }}
    >
      <Card className="group relative overflow-hidden border-t-4 border-t-primary hover:shadow-2xl transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-2">
            {title}
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="relative">{children}</CardContent>
      </Card>
    </motion.div>
  );
}

interface OrdersChartData {
  date: string;
  orders: number;
  revenue: number;
}

interface OrdersLineChartProps {
  data: OrdersChartData[];
}

export function OrdersLineChart({ data }: OrdersLineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#004494" stopOpacity={0.1} />
            <stop offset="95%" stopColor="#004494" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
        <XAxis 
          dataKey="date" 
          stroke="hsl(var(--muted-foreground))" 
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <YAxis 
          stroke="hsl(var(--muted-foreground))" 
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend 
          wrapperStyle={{ paddingTop: "20px" }}
          iconType="circle"
        />
        <Line
          type="monotone"
          dataKey="orders"
          stroke="#004494"
          strokeWidth={3}
          dot={{ fill: "#004494", r: 5, strokeWidth: 2, stroke: "#fff" }}
          activeDot={{ r: 7, strokeWidth: 2 }}
          name="Commandes"
          fill="url(#colorOrders)"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

interface RevenueAreaChartProps {
  data: OrdersChartData[];
}

export function RevenueAreaChart({ data }: RevenueAreaChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#004494" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#004494" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
        <XAxis 
          dataKey="date" 
          stroke="hsl(var(--muted-foreground))" 
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <YAxis 
          stroke="hsl(var(--muted-foreground))" 
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#004494"
          strokeWidth={3}
          fillOpacity={1}
          fill="url(#colorRevenue)"
          name="Revenu"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface CategoryData {
  name: string;
  value: number;
}

interface CategoryPieChartProps {
  data: CategoryData[];
}

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data={data as any}
          cx="50%"
          cy="50%"
          labelLine={false}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label={(props: any) => {
            const { name, percent } = props;
            return `${name || ""}: ${((percent || 0) * 100).toFixed(0)}%`;
          }}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "6px",
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

interface StatusBarChartProps {
  data: { status: string; count: number }[];
  statusLabels?: Record<string, string>;
  countLabel?: string;
}

export function StatusBarChart({ data, statusLabels = {}, countLabel = "Count" }: StatusBarChartProps) {
  const getStatusColor = (status: string) => {
    // Use different shades of blue for different statuses
    const statusMap: Record<string, string> = {
      pending: "#3b82f6",      // Lighter blue
      confirmed: "#004494",     // Primary blue
      shipped: "#1e5aa8",      // Medium blue
      delivered: "#60a5fa",    // Light blue
      cancelled: "#93c5fd",    // Very light blue (muted)
    };
    return statusMap[status.toLowerCase()] || "#004494";
  };

  // Transform data to use translated labels
  const translatedData = data.map((entry) => ({
    ...entry,
    status: statusLabels[entry.status] || entry.status,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={translatedData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
        <XAxis 
          dataKey="status" 
          stroke="hsl(var(--muted-foreground))" 
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <YAxis 
          stroke="hsl(var(--muted-foreground))" 
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar 
          dataKey="count" 
          radius={[8, 8, 0, 0]} 
          name={countLabel}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getStatusColor(entry.status)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

