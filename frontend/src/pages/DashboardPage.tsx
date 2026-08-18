import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { API } from "../lib/api";
import { AnalyticsSummary, CumulativePoint, Period } from "../types/analytics";
import { KPICards } from "../components/KPICards";
import { CumulativeChart } from "../components/CumulativeChart";
import { SportDistributionChart, PlatformPerformanceChart } from "../components/BreakdownCharts";

const PERIOD_LABELS: Record<Period, string> = {
  today: "Hoje",
  week: "Semana",
  month: "Mês",
  "all-time": "Todo período",
};

export function DashboardPage() {
  const { user, logout } = useAuth();
  const [period, setPeriod] = useState<Period>("month");
  const [sport, setSport] = useState("");
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [cumulative, setCumulative] = useState<CumulativePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = sport ? { period, sport } : { period };
        const [summaryRes, cumulativeRes] = await Promise.all([
          API.get<AnalyticsSummary>("/analytics/summary", { params }),
          API.get<CumulativePoint[]>("/analytics/cumulative", { params: { period } }),
        ]);
        if (!cancelled) {
          setSummary(summaryRes.data);
          setCumulative(cumulativeRes.data);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.response?.data?.error || "Não foi possível carregar o dashboard");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [period, sport]);

  const sportOptions = summary ? Object.keys(summary.breakdown.bySport) : [];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-2xl font-semibold text-gray-900">
              Bem-vindo, {user?.full_name || user?.email}
            </h1>
            <button
              onClick={logout}
              className="rounded bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300"
            >
              Sair
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to="/bets"
              className="inline-block rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              Ver minhas apostas
            </Link>
            <Link
              to="/calculators/surebet"
              className="inline-block rounded bg-gray-200 px-4 py-2 text-sm text-gray-800 hover:bg-gray-300"
            >
              Calculadora Surebet
            </Link>
            <Link
              to="/calculators/duplo-green"
              className="inline-block rounded bg-gray-200 px-4 py-2 text-sm text-gray-800 hover:bg-gray-300"
            >
              Calculadora Duplo Green
            </Link>
            <Link
              to="/calculators/free-bet"
              className="inline-block rounded bg-gray-200 px-4 py-2 text-sm text-gray-800 hover:bg-gray-300"
            >
              Calculadora Aposta Grátis
            </Link>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <div className="flex gap-1 rounded bg-gray-100 p-1">
              {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`rounded px-3 py-1 text-sm ${
                    period === p ? "bg-white shadow font-medium" : "text-gray-600"
                  }`}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>

            <select
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              className="rounded border border-gray-300 px-3 py-1 text-sm"
            >
              <option value="">Todos os esportes</option>
              {sportOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {loading && <p className="text-sm text-gray-500">Carregando...</p>}

          {summary && !loading && (
            <div className="space-y-6">
              <KPICards metrics={summary.metrics} />

              <div className="rounded border border-gray-200 p-4">
                <h2 className="mb-2 text-lg font-semibold text-gray-900">Ganho Acumulado</h2>
                <CumulativeChart data={cumulative} />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded border border-gray-200 p-4">
                  <h2 className="mb-2 text-lg font-semibold text-gray-900">Por Esporte</h2>
                  <SportDistributionChart breakdown={summary.breakdown.bySport} />
                </div>
                <div className="rounded border border-gray-200 p-4">
                  <h2 className="mb-2 text-lg font-semibold text-gray-900">Por Plataforma</h2>
                  <PlatformPerformanceChart breakdown={summary.breakdown.byPlatform} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded border border-gray-200 p-4">
                  <h2 className="mb-2 text-lg font-semibold text-gray-900">Melhor Aposta</h2>
                  {summary.metrics.bestBet ? (
                    <div className="text-sm">
                      <p>
                        {summary.metrics.bestBet.event_description ||
                          summary.metrics.bestBet.bet_description ||
                          "Sem descrição"}
                      </p>
                      <p className="font-semibold text-green-700">
                        R$ {Number(summary.metrics.bestBet.net_gain).toFixed(2)}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Sem apostas finalizadas.</p>
                  )}
                </div>
                <div className="rounded border border-gray-200 p-4">
                  <h2 className="mb-2 text-lg font-semibold text-gray-900">Pior Aposta</h2>
                  {summary.metrics.worstBet ? (
                    <div className="text-sm">
                      <p>
                        {summary.metrics.worstBet.event_description ||
                          summary.metrics.worstBet.bet_description ||
                          "Sem descrição"}
                      </p>
                      <p className="font-semibold text-red-600">
                        R$ {Number(summary.metrics.worstBet.net_gain).toFixed(2)}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Sem apostas finalizadas.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
