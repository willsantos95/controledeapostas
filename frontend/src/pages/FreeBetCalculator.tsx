import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { API } from "../lib/api";

type FreeBetType = "simple" | "with-lay";

interface FormValues {
  type: FreeBetType;
  freeBetValue: number;
  odd: number;
  oddBack: number;
  oddLay: number;
}

interface FreeBetResult {
  type: FreeBetType;
  recommendedStake: string;
  gainIfWin: string;
  gainIfLose: string;
  greenBox?: string;
  layStake?: string;
  notes: string;
  error?: string;
}

export function FreeBetCalculator() {
  const [result, setResult] = useState<FreeBetResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = useForm<FormValues>({ defaultValues: { type: "simple" } });

  const type = watch("type");

  const onSubmit = async (values: FormValues) => {
    setError(null);
    setResult(null);
    try {
      const payload =
        values.type === "simple"
          ? {
              type: "simple",
              freeBetValue: Number(values.freeBetValue),
              odd: Number(values.odd),
            }
          : {
              type: "with-lay",
              freeBetValue: Number(values.freeBetValue),
              oddBack: Number(values.oddBack),
              oddLay: Number(values.oddLay),
            };

      const { data } = await API.post("/calculators/free-bet", payload);
      setResult(data);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Não foi possível calcular");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-xl rounded-lg bg-white p-8 shadow">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Calculadora Aposta Grátis</h1>
          <Link to="/dashboard" className="text-sm text-blue-600 hover:underline">
            Voltar
          </Link>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}

          <div>
            <label className="block text-sm font-medium text-gray-700">Modo</label>
            <select
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              {...register("type")}
            >
              <option value="simple">Simples</option>
              <option value="with-lay">Com Lay (Exchange)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Valor da Aposta Grátis (R$)</label>
            <input
              type="number"
              step="0.01"
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              {...register("freeBetValue", { required: true, min: 0.01 })}
            />
          </div>

          {type === "simple" ? (
            <div>
              <label className="block text-sm font-medium text-gray-700">Odd do Evento</label>
              <input
                type="number"
                step="0.01"
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                {...register("odd", { required: type === "simple", min: 1.01 })}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Odd Back</label>
                <input
                  type="number"
                  step="0.01"
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                  {...register("oddBack", { required: type === "with-lay", min: 1.01 })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Odd Lay</label>
                <input
                  type="number"
                  step="0.01"
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                  {...register("oddLay", { required: type === "with-lay", min: 1.01 })}
                />
              </div>
            </div>
          )}

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
              <p>Valor recomendado: R$ {Number(result.recommendedStake).toFixed(2)}</p>
              <p>Ganho se vencer: R$ {Number(result.gainIfWin).toFixed(2)}</p>
              <p>Ganho/Perda se perder: R$ {Number(result.gainIfLose).toFixed(2)}</p>
              {result.layStake && <p>Stake de lay: R$ {Number(result.layStake).toFixed(2)}</p>}
              {result.greenBox && (
                <p className="font-semibold text-green-700">
                  Green box (garantido): R$ {Number(result.greenBox).toFixed(2)}
                </p>
              )}
              <p className="text-gray-600">{result.notes}</p>
            </div>
          </div>
        )}
        {result?.error && <p className="mt-6 text-sm text-red-600">{result.error}</p>}
      </div>
    </div>
  );
}
