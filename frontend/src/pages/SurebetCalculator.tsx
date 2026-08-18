import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { API } from "../lib/api";

interface FormValues {
  odd1: number;
  odd2: number;
  stake1: number;
}

interface SurebetResult {
  isSurebet: boolean;
  profitMargin: string;
  stake1: string;
  stake2: string;
  totalStake: string;
  guaranteedProfit: string;
  roi: string;
  error?: string;
}

export function SurebetCalculator() {
  const [result, setResult] = useState<SurebetResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormValues>();

  const onSubmit = async (values: FormValues) => {
    setError(null);
    setResult(null);
    try {
      const { data } = await API.post("/calculators/surebet", {
        odd1: Number(values.odd1),
        odd2: Number(values.odd2),
        stake1: Number(values.stake1),
      });
      setResult(data);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Não foi possível calcular");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-xl rounded-lg bg-white p-8 shadow">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Calculadora Surebet</h1>
          <Link to="/dashboard" className="text-sm text-blue-600 hover:underline">
            Voltar
          </Link>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Odd Casa A</label>
              <input
                type="number"
                step="0.01"
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                {...register("odd1", { required: true, min: 1.01 })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Odd Casa B</label>
              <input
                type="number"
                step="0.01"
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                {...register("odd2", { required: true, min: 1.01 })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Stake Casa A (R$)</label>
            <input
              type="number"
              step="0.01"
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              {...register("stake1", { required: true, min: 0.01 })}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Calcular
          </button>
        </form>

        {result && (
          <div className="mt-6 rounded border border-gray-200 p-4">
            {result.isSurebet ? (
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-green-700">Surebet válida!</p>
                <p>Margin de lucro: {Number(result.profitMargin).toFixed(2)}%</p>
                <p>Stake Casa A: R$ {Number(result.stake1).toFixed(2)}</p>
                <p>Stake Casa B: R$ {Number(result.stake2).toFixed(2)}</p>
                <p>Total apostado: R$ {Number(result.totalStake).toFixed(2)}</p>
                <p className="font-semibold">
                  Ganho garantido: R$ {Number(result.guaranteedProfit).toFixed(2)}
                </p>
                <p>ROI: {Number(result.roi).toFixed(2)}%</p>
              </div>
            ) : (
              <p className="text-sm text-red-600">{result.error || "Não é uma surebet"}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
