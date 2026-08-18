import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { BreakdownEntry } from "../types/analytics";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

function toChartData(breakdown: Record<string, BreakdownEntry>) {
  return Object.entries(breakdown).map(([name, value]) => ({
    name,
    bets: value.bets,
    netGain: value.netGain,
  }));
}

export function SportDistributionChart({
  breakdown,
}: {
  breakdown: Record<string, BreakdownEntry>;
}) {
  const data = toChartData(breakdown);

  if (data.length === 0) {
    return <p className="text-sm text-gray-500">Sem dados por esporte.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={data} dataKey="bets" nameKey="name" outerRadius={90} label>
          {data.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function PlatformPerformanceChart({
  breakdown,
}: {
  breakdown: Record<string, BreakdownEntry>;
}) {
  const data = toChartData(breakdown);

  if (data.length === 0) {
    return <p className="text-sm text-gray-500">Sem dados por plataforma.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
        <Legend />
        <Bar dataKey="netGain" name="Ganho Real" fill="#3b82f6" />
      </BarChart>
    </ResponsiveContainer>
  );
}
