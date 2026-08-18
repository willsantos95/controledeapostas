import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { API } from "../lib/api";

interface FormValues {
  odd1: number;
  oddX: number;
  odd2: number;
  stakeInitial: number;
}

interface DuploGreenResult {
  stake1: string;
  stakeX: string;
  stake2: string;
  totalStake: string;
  garanteedWin: string;
  green: string;
  roi: string;
  error?: string;
}

export function DuploGreenCalculator() {
  const [result, setResult] = useState<DuploGreenResult | null>(null);
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
      const { data } = await API.post("/calculators/duplo-green", {
        odd1: Number(values.odd1),
        oddX: Number(values.oddX),
        odd2: Number(values.odd2),
        stakeInitial: Number(values.stakeInitial),
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
          <h1 className="text-2xl font-semibold text-gray-900">Calculadora Duplo Green</h1>
          <Link to="/dashboard" className="text-sm text-blue-600 hover:underline">
            Voltar
          </Link>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Odd Casa (1)</label>
              <input
                type="number"
                step="0.01"
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                {...register("odd1", { required: true, min: 1.01 })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Odd Empate (X)</label>
              <input
                type="number"
                step="0.01"
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                {...register("oddX", { required: true, min: 1.01 })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Odd Fora (2)</label>
              <input
                type="number"
                step="0.01"
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                {...register("odd2", { required: true, min: 1.01 })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Stake Inicial (Casa)</label>
            <input
              type="number"
              step="0.01"
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              {...register("stakeInitial", { required: true, min: 0.01 })}
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

        {result && !result.error && (
          <div className="mt-6 rounded border border-gray-200 p-4">
            <div className="space-y-1 text-sm">
              <p>Stake Casa: R$ {Number(result.stake1).toFixed(2)}</p>
              <p>Stake Empate: R$ {Number(result.stakeX).toFixed(2)}</p>
              <p>Stake Fora: R$ {Number(result.stake2).toFixed(2)}</p>
              <p>Total apostado: R$ {Number(result.totalStake).toFixed(2)}</p>
              <p>Ganho em qualquer cenário: R$ {Number(result.garanteedWin).toFixed(2)}</p>
              <p
                className={`font-semibold ${
                  Number(result.green) >= 0 ? "text-green-700" : "text-red-600"
                }`}
              >
                Green: R$ {Number(result.green).toFixed(2)}
              </p>
              <p>ROI: {Number(result.roi).toFixed(2)}%</p>
              {Number(result.green) < 0 && (
                <p className="text-red-600">
                  Atenção: green negativo. Ajuste as odds antes de apostar.
                </p>
              )}
            </div>
          </div>
        )}
        {result?.error && <p className="mt-6 text-sm text-red-600">{result.error}</p>}
      </div>
    </div>
  );
}
