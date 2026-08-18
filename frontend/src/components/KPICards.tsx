import { AnalyticsMetrics } from "../types/analytics";

const colorClasses: Record<string, string> = {
  green: "border-green-300 bg-green-50",
  red: "border-red-300 bg-red-50",
  blue: "border-blue-300 bg-blue-50",
  orange: "border-orange-300 bg-orange-50",
};

export function KPICards({ metrics }: { metrics: AnalyticsMetrics }) {
  const cards = [
    {
      title: "Ganho Real",
      value: `R$ ${metrics.netGain.toFixed(2)}`,
      color: metrics.netGain >= 0 ? "green" : "red",
      icon: "💰",
    },
    {
      title: "ROI",
      value: `${metrics.roi.toFixed(2)}%`,
      color: metrics.roi >= 0 ? "green" : "red",
      icon: "📈",
    },
    {
      title: "Win Rate",
      value: `${metrics.winRate.toFixed(1)}%`,
      color: metrics.winRate >= 50 ? "green" : "orange",
      icon: "🎯",
    },
    {
      title: "Total de Apostas",
      value: String(metrics.totalBets),
      color: "blue",
      icon: "📊",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {cards.map((card) => (
        <div key={card.title} className={`rounded-lg border p-4 ${colorClasses[card.color]}`}>
          <div className="mb-2 text-3xl">{card.icon}</div>
          <p className="text-sm font-medium text-gray-600">{card.title}</p>
          <p className="text-2xl font-bold">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
