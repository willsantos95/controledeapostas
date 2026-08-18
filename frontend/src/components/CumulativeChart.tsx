import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { CumulativePoint } from "../types/analytics";

export function CumulativeChart({ data }: { data: CumulativePoint[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-gray-500">Sem dados no período selecionado.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
        <Legend />
        <Line
          type="monotone"
          dataKey="balance"
          stroke="#10b981"
          strokeWidth={2}
          name="Saldo Acumulado"
          dot={{ r: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
