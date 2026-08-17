import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router-dom";
import { API } from "../lib/api";
import { ScreenshotUploader, UploadedScreenshot } from "../components/ScreenshotUploader";
import { BetType } from "../types/bet";

interface BetFormValues {
  bet_id: string;
  platform: string;
  stake: number;
  initial_odds: number;
  bet_type: BetType;
  sport: string;
  event_description: string;
  bet_description: string;
  notes: string;
}

export function BetForm() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [screenshots, setScreenshots] = useState<UploadedScreenshot[]>([]);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<BetFormValues>({ defaultValues: { bet_type: "single" } });

  const onSubmit = async (values: BetFormValues) => {
    setError(null);
    try {
      const { data } = await API.post("/bets", {
        ...values,
        stake: Number(values.stake),
        initial_odds: Number(values.initial_odds),
        screenshot_urls: screenshots.map((s) => s.url),
      });
      navigate(`/bets/${data.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Não foi possível criar a aposta");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl rounded-lg bg-white p-8 shadow">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Nova Aposta</h1>
          <Link to="/bets" className="text-sm text-blue-600 hover:underline">
            Voltar
          </Link>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">ID da Aposta</label>
              <input
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                {...register("bet_id", { required: true })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Plataforma</label>
              <input
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                {...register("platform")}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Stake (R$)</label>
              <input
                type="number"
                step="0.01"
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                {...register("stake", { required: true, min: 0.01 })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Odd Inicial</label>
              <input
                type="number"
                step="0.01"
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                {...register("initial_odds", { required: true, min: 1 })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Tipo</label>
              <select
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                {...register("bet_type")}
              >
                <option value="single">Simples</option>
                <option value="parlay">Combinada</option>
                <option value="multiple">Múltipla</option>
                <option value="system">Sistema</option>
                <option value="free">Free bet</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Esporte</label>
              <input
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                {...register("sport")}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Evento</label>
            <input
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              {...register("event_description")}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Descrição da Aposta</label>
            <input
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              {...register("bet_description")}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Notas</label>
            <textarea
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              rows={3}
              {...register("notes")}
            />
          </div>

          <ScreenshotUploader screenshots={screenshots} onScreenshotsChange={setScreenshots} />

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Criar Aposta
          </button>
        </form>
      </div>
    </div>
  );
}
