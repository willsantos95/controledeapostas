import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { API } from "../lib/api";
import { Bet, BetStatus } from "../types/bet";

interface ResultForm {
  status: BetStatus;
  result_odd: number;
  win_amount: number;
}

export function BetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bet, setBet] = useState<Bet | null>(null);
  const [loading, setLoading] = useState(true);
  const [showResultForm, setShowResultForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = useForm<ResultForm>({ defaultValues: { status: "won" } });
  const statusWatch = watch("status");

  const loadBet = () => {
    setLoading(true);
    API.get(`/bets/${id}`)
      .then(({ data }) => setBet(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onSubmitResult = async (values: ResultForm) => {
    setError(null);
    try {
      const payload: Record<string, unknown> = { status: values.status };
      if (values.status === "won") {
        payload.result_odd = Number(values.result_odd);
        payload.win_amount = Number(values.win_amount);
      }
      const { data } = await API.post(`/bets/${id}/result`, payload);
      setBet(data);
      setShowResultForm(false);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Não foi possível registrar o resultado");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Deletar esta aposta?")) return;
    await API.delete(`/bets/${id}`);
    navigate("/bets");
  };

  if (loading) {
    return <div className="p-8 text-gray-500">Carregando...</div>;
  }

  if (!bet) {
    return <div className="p-8 text-gray-500">Aposta não encontrada.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl rounded-lg bg-white p-8 shadow">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">{bet.bet_id}</h1>
          <Link to="/bets" className="text-sm text-blue-600 hover:underline">
            Voltar
          </Link>
        </div>

        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Plataforma</dt>
            <dd className="font-medium">{bet.platform || "-"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Esporte</dt>
            <dd className="font-medium">{bet.sport || "-"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Stake</dt>
            <dd className="font-medium">R$ {bet.stake}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Odd Inicial</dt>
            <dd className="font-medium">{bet.initial_odds}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Status</dt>
            <dd className="font-medium capitalize">{bet.status}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Ganho Líquido</dt>
            <dd className="font-medium">{bet.net_gain !== null ? `R$ ${bet.net_gain}` : "-"}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-gray-500">Evento</dt>
            <dd className="font-medium">{bet.event_description || "-"}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-gray-500">Descrição</dt>
            <dd className="font-medium">{bet.bet_description || "-"}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-gray-500">Notas</dt>
            <dd className="font-medium">{bet.notes || "-"}</dd>
          </div>
        </dl>

        {bet.screenshot_urls && bet.screenshot_urls.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-2 text-sm font-medium text-gray-700">Screenshots</h2>
            <div className="grid grid-cols-3 gap-2">
              {bet.screenshot_urls.map((url) => (
                <a key={url} href={url} target="_blank" rel="noreferrer">
                  <img src={url} alt="Screenshot" className="h-24 w-full rounded object-cover" />
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 flex gap-3">
          {bet.status === "pending" && (
            <>
              <Link
                to={`/bets/${bet.id}/edit`}
                className="rounded bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300"
              >
                Editar
              </Link>
              <button
                onClick={() => setShowResultForm((v) => !v)}
                className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
              >
                Marcar Resultado
              </button>
            </>
          )}
          <button
            onClick={handleDelete}
            className="rounded bg-red-100 px-4 py-2 text-sm text-red-700 hover:bg-red-200"
          >
            Deletar
          </button>
        </div>

        {showResultForm && (
          <form onSubmit={handleSubmit(onSubmitResult)} className="mt-6 space-y-4 rounded border border-gray-200 p-4">
            {error && <p className="text-sm text-red-600">{error}</p>}

            <div>
              <label className="block text-sm font-medium text-gray-700">Resultado</label>
              <select
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                {...register("status", { required: true })}
              >
                <option value="won">Ganha</option>
                <option value="lost">Perdida</option>
                <option value="void">Void</option>
                <option value="canceled">Cancelada</option>
              </select>
            </div>

            {statusWatch === "won" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Odd Final</label>
                  <input
                    type="number"
                    step="0.01"
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                    {...register("result_odd", { required: true, min: 1 })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Valor Ganho (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                    {...register("win_amount", { required: true, min: 0 })}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Confirmar Resultado
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
