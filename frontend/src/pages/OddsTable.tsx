import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

function range(min: number, max: number, step: number): number[] {
  const values: number[] = [];
  for (let v = min; v <= max + 1e-9; v += step) {
    values.push(Math.round(v * 100) / 100);
  }
  return values;
}

function roiPercent(odd1: number, odd2: number): number {
  const margin = 1 / odd1 + 1 / odd2;
  return (1 / margin - 1) * 100;
}

export function OddsTable() {
  const [min1, setMin1] = useState("1.10");
  const [max1, setMax1] = useState("3.00");
  const [step1, setStep1] = useState("0.10");
  const [min2, setMin2] = useState("1.10");
  const [max2, setMax2] = useState("3.00");
  const [step2, setStep2] = useState("0.10");

  const rows = useMemo(
    () => range(Number(min1), Number(max1), Number(step1) || 0.1),
    [min1, max1, step1]
  );
  const cols = useMemo(
    () => range(Number(min2), Number(max2), Number(step2) || 0.1),
    [min2, max2, step2]
  );

  const tooLarge = rows.length * cols.length > 4000;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl rounded-lg bg-white p-8 shadow">
        <div className="mb-2 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Tabela de Odds (Surebet)</h1>
          <Link to="/dashboard" className="text-sm text-blue-600 hover:underline">
            Voltar
          </Link>
        </div>
        <p className="mb-6 text-sm text-gray-500">
          Visualização rápida do ROI% de surebet para cada combinação de Odd 1 × Odd 2. Verde =
          surebet válida (lucro garantido); vermelho = não é surebet.
        </p>

        <div className="mb-6 grid grid-cols-2 gap-6 md:grid-cols-6">
          <div>
            <label className="block text-xs font-medium text-gray-700">Odd 1 mín</label>
            <input
              type="number"
              step="0.01"
              value={min1}
              onChange={(e) => setMin1(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Odd 1 máx</label>
            <input
              type="number"
              step="0.01"
              value={max1}
              onChange={(e) => setMax1(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Odd 1 passo</label>
            <input
              type="number"
              step="0.01"
              value={step1}
              onChange={(e) => setStep1(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Odd 2 mín</label>
            <input
              type="number"
              step="0.01"
              value={min2}
              onChange={(e) => setMin2(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Odd 2 máx</label>
            <input
              type="number"
              step="0.01"
              value={max2}
              onChange={(e) => setMax2(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Odd 2 passo</label>
            <input
              type="number"
              step="0.01"
              value={step2}
              onChange={(e) => setStep2(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
            />
          </div>
        </div>

        {tooLarge ? (
          <p className="text-sm text-red-600">
            Faixa muito grande ({rows.length * cols.length} células). Reduza o intervalo ou
            aumente o passo.
          </p>
        ) : (
          <div className="overflow-auto" style={{ maxHeight: "70vh" }}>
            <table className="border-collapse text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 top-0 z-20 border border-gray-200 bg-gray-100 p-1">
                    Odd1 \ Odd2
                  </th>
                  {cols.map((odd2) => (
                    <th
                      key={odd2}
                      className="sticky top-0 z-10 border border-gray-200 bg-gray-100 p-1 font-medium"
                    >
                      {odd2.toFixed(2)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((odd1) => (
                  <tr key={odd1}>
                    <th className="sticky left-0 z-10 border border-gray-200 bg-gray-100 p-1 font-medium">
                      {odd1.toFixed(2)}
                    </th>
                    {cols.map((odd2) => {
                      const roi = roiPercent(odd1, odd2);
                      const isSurebet = roi > 0;
                      return (
                        <td
                          key={odd2}
                          title={`Odd1 ${odd1.toFixed(2)} × Odd2 ${odd2.toFixed(2)} → ${roi.toFixed(2)}%`}
                          className={`border border-gray-200 p-1 text-center ${
                            isSurebet
                              ? "bg-green-50 text-green-800"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {roi.toFixed(2)}%
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
