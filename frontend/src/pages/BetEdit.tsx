import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { API } from "../lib/api";
import { ScreenshotUploader, UploadedScreenshot } from "../components/ScreenshotUploader";
import { Bet } from "../types/bet";

interface BetEditValues {
  stake: number;
  initial_odds: number;
  bet_description: string;
  notes: string;
}

export function BetEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [screenshots, setScreenshots] = useState<UploadedScreenshot[]>([]);
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<BetEditValues>();

  useEffect(() => {
    API.get(`/bets/${id}`)
      .then(({ data }: { data: Bet }) => {
        reset({
          stake: Number(data.stake),
          initial_odds: Number(data.initial_odds),
          bet_description: data.bet_description || "",
          notes: data.notes || "",
        });
        setScreenshots(
          (data.screenshot_urls || []).map((url) => ({ url, tempId: url }))
        );
      })
      .finally(() => setLoading(false));
  }, [id, reset]);

  const onSubmit = async (values: BetEditValues) => {
    setError(null);
    try {
      await API.put(`/bets/${id}`, {
        ...values,
        stake: Number(values.stake),
        initial_odds: Number(values.initial_odds),
        screenshot_urls: screenshots.map((s) => s.url),
      });
      navigate(`/bets/${id}`);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Não foi possível atualizar a aposta");
    }
  };

  if (loading) {
    return <div className="p-8 text-gray-500">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl rounded-lg bg-white p-8 shadow">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Editar Aposta</h1>
          <Link to={`/bets/${id}`} className="text-sm text-blue-600 hover:underline">
            Voltar
          </Link>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}

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
            Salvar Alterações
          </button>
        </form>
      </div>
    </div>
  );
}
