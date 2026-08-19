import { useState } from "react";
import { Link } from "react-router-dom";
import { API } from "../lib/api";

interface LegInput {
  odds: string;
  isFreebet: boolean;
}

interface LegResult {
  odds: string;
  stake: string;
  cost: string;
  isFreebet: boolean;
  payout: string;
  profit: string;
}

interface DistributionResult {
  isValid: boolean;
  legs: LegResult[];
  totalInvested: string;
  minProfit: string;
  roi: string | null;
  error?: string;
}

const emptyLeg = (): LegInput => ({ odds: "", isFreebet: false });

export function DistributionCalculator() {
  const [legs, setLegs] = useState<LegInput[]>([emptyLeg(), emptyLeg()]);
  const [anchorStake, setAnchorStake] = useState("100");
  const [result, setResult] = useState<DistributionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const updateLeg = (index: number, patch: Partial<LegInput>) => {
    setLegs((prev) => prev.map((leg, i) => (i === index ? { ...leg, ...patch } : leg)));
  };

  const addLeg = () => setLegs((prev) => [...prev, emptyLeg()]);
  const removeLeg = (index: number) =>
    setLegs((prev) => (prev.length > 2 ? prev.filter((_, i) => i !== index) : prev));

  const onSubmit = async () => {
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const { data } = await API.post("/calculators/distribution", {
        legs: legs.map((leg) => ({
          odds: Number(leg.odds),
          isFreebet: leg.isFreebet,
        })),
        anchorStake: Number(anchorStake),
        anchorIndex: 0,
      });
      setResult(data);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Não foi possível calcular");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl rounded-lg bg-white p-8 shadow">
        <div className="mb-2 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Distribuição de Apostas</h1>
          <Link to="/dashboard" className="text-sm text-blue-600 hover:underline">
            Voltar
          </Link>
        </div>
        <p className="mb-6 text-sm text-gray-500">
          Calculadora genérica de surebet, duplo green e combinações com aposta grátis: adicione
          quantas pernas (resultados possíveis) o mercado tiver, marque as que forem aposta
          grátis, e distribua os stakes para igualar o lucro em qualquer cenário.
        </p>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <div className="space-y-3">
          {legs.map((leg, i) => (
            <div key={i} className="flex items-end gap-3 rounded border border-gray-200 p-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700">
                  Odd perna {i + 1}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={leg.odds}
                  onChange={(e) => updateLeg(i, { odds: e.target.value })}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                />
              </div>
              {i === 0 && (
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Stake perna 1 (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={anchorStake}
                    onChange={(e) => setAnchorStake(e.target.value)}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                  />
                </div>
              )}
              <label className="flex items-center gap-1 pb-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={leg.isFreebet}
                  onChange={(e) => updateLeg(i, { isFreebet: e.target.checked })}
                />
                Freebet
              </label>
              <button
                type="button"
                onClick={() => removeLeg(i)}
                disabled={legs.length <= 2}
                className="rounded bg-red-100 px-2 py-2 text-sm text-red-700 hover:bg-red-200 disabled:opacity-40"
              >
                Remover
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={addLeg}
            className="rounded bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300"
          >
            Adicionar Perna
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={loading}
            className="flex-1 rounded bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Calculando..." : "Distribuir Apostas"}
          </button>
        </div>

        {result?.isValid && (
          <div className="mt-6 space-y-4">
            <div className="overflow-x-auto rounded border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-left">Perna</th>
                    <th className="p-2 text-left">Odd</th>
                    <th className="p-2 text-left">Stake</th>
                    <th className="p-2 text-left">Custo</th>
                    <th className="p-2 text-left">Payout</th>
                    <th className="p-2 text-left">Lucro</th>
                  </tr>
                </thead>
                <tbody>
                  {result.legs.map((leg, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="p-2">
                        {i + 1}
                        {leg.isFreebet && (
                          <span className="ml-1 text-xs text-blue-600">(freebet)</span>
                        )}
                      </td>
                      <td className="p-2">{Number(leg.odds).toFixed(2)}</td>
                      <td className="p-2">R$ {Number(leg.stake).toFixed(2)}</td>
                      <td className="p-2">R$ {Number(leg.cost).toFixed(2)}</td>
                      <td className="p-2">R$ {Number(leg.payout).toFixed(2)}</td>
                      <td
                        className={`p-2 font-medium ${
                          Number(leg.profit) >= 0 ? "text-green-700" : "text-red-600"
                        }`}
                      >
                        R$ {Number(leg.profit).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded border border-gray-200 p-4 text-sm">
              <p>Total investido: R$ {Number(result.totalInvested).toFixed(2)}</p>
              <p
                className={`font-semibold ${
                  Number(result.minProfit) >= 0 ? "text-green-700" : "text-red-600"
                }`}
              >
                Lucro mínimo garantido: R$ {Number(result.minProfit).toFixed(2)}
              </p>
              {result.roi !== null && <p>ROI: {Number(result.roi).toFixed(2)}%</p>}
              {Number(result.minProfit) < 0 && (
                <p className="text-red-600">
                  Atenção: lucro mínimo negativo. Ajuste as odds antes de apostar.
                </p>
              )}
            </div>
          </div>
        )}
        {result && !result.isValid && (
          <p className="mt-6 text-sm text-red-600">{result.error}</p>
        )}
      </div>
    </div>
  );
}
