import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { API } from "../lib/api";
import { Bet } from "../types/bet";

const LIMIT = 20;

export function BetsList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [bets, setBets] = useState<Bet[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const status = searchParams.get("status") || "";
  const sport = searchParams.get("sport") || "";
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  useEffect(() => {
    setLoading(true);
    API.get("/bets", { params: { status: status || undefined, sport: sport || undefined, limit: LIMIT, offset } })
      .then(({ data }) => {
        setBets(data.bets);
        setTotal(data.total);
      })
      .finally(() => setLoading(false));
  }, [status, sport, offset]);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    params.set("offset", "0");
    setSearchParams(params);
  };

  const goToOffset = (newOffset: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("offset", String(newOffset));
    setSearchParams(params);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Minhas Apostas</h1>
          <div className="flex gap-2">
            <Link to="/dashboard" className="rounded bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300">
              Dashboard
            </Link>
            <Link to="/bets/new" className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
              Nova Aposta
            </Link>
          </div>
        </div>

        <div className="mb-4 flex gap-3 rounded-lg bg-white p-4 shadow">
          <select
            value={status}
            onChange={(e) => updateParam("status", e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Todos os status</option>
            <option value="pending">Pendente</option>
            <option value="won">Ganha</option>
            <option value="lost">Perdida</option>
            <option value="void">Void</option>
            <option value="canceled">Cancelada</option>
          </select>
          <input
            placeholder="Filtrar por esporte"
            value={sport}
            onChange={(e) => updateParam("sport", e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="overflow-x-auto rounded-lg bg-white shadow">
          {loading ? (
            <p className="p-6 text-gray-500">Carregando...</p>
          ) : bets.length === 0 ? (
            <p className="p-6 text-gray-500">Nenhuma aposta encontrada.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-left text-gray-600">
                <tr>
                  <th className="px-4 py-2">Bilhete</th>
                  <th className="px-4 py-2">Esporte</th>
                  <th className="px-4 py-2">Stake</th>
                  <th className="px-4 py-2">Odd</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Ganho</th>
                </tr>
              </thead>
              <tbody>
                {bets.map((bet) => (
                  <tr key={bet.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <Link to={`/bets/${bet.id}`} className="text-blue-600 hover:underline">
                        {bet.bet_id}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{bet.sport || "-"}</td>
                    <td className="px-4 py-2">R$ {bet.stake}</td>
                    <td className="px-4 py-2">{bet.initial_odds}</td>
                    <td className="px-4 py-2 capitalize">{bet.status}</td>
                    <td className="px-4 py-2">{bet.net_gain !== null ? `R$ ${bet.net_gain}` : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>
            {total > 0 ? `${offset + 1}-${Math.min(offset + LIMIT, total)} de ${total}` : ""}
          </span>
          <div className="flex gap-2">
            <button
              disabled={offset === 0}
              onClick={() => goToOffset(Math.max(0, offset - LIMIT))}
              className="rounded bg-gray-200 px-3 py-1 disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              disabled={offset + LIMIT >= total}
              onClick={() => goToOffset(offset + LIMIT)}
              className="rounded bg-gray-200 px-3 py-1 disabled:opacity-50"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
