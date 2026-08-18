import Decimal from "decimal.js";

export type Period = "today" | "week" | "month" | "all-time";

export interface DateRange {
  from: Date;
  to: Date;
}

export function getDateRange(period: Period, now: Date = new Date()): DateRange {
  let from: Date;

  switch (period) {
    case "today":
      from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      break;
    case "week":
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "month":
      from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      break;
    case "all-time":
      from = new Date("1970-01-01T00:00:00.000Z");
      break;
  }

  return { from, to: now };
}

export interface BetRow {
  id: string;
  stake: string | number;
  win_amount: string | number | null;
  net_gain: string | number | null;
  status: string;
  sport: string | null;
  platform: string | null;
  bet_type: string;
  event_description: string | null;
  bet_description: string | null;
}

export interface Metrics {
  totalBets: number;
  betsWon: number;
  betsLost: number;
  betsVoid: number;
  winRate: number;
  totalStake: number;
  totalWinAmount: number;
  netGain: number;
  roi: number;
  avgBetSize: number;
  avgGainPerBet: number;
  bestBet: BetRow | null;
  worstBet: BetRow | null;
}

export function calculateMetrics(bets: BetRow[]): Metrics {
  if (bets.length === 0) {
    return {
      totalBets: 0,
      betsWon: 0,
      betsLost: 0,
      betsVoid: 0,
      winRate: 0,
      totalStake: 0,
      totalWinAmount: 0,
      netGain: 0,
      roi: 0,
      avgBetSize: 0,
      avgGainPerBet: 0,
      bestBet: null,
      worstBet: null,
    };
  }

  const totalBets = bets.length;
  const betsWon = bets.filter((b) => b.status === "won").length;
  const betsLost = bets.filter((b) => b.status === "lost").length;
  const betsVoid = bets.filter((b) => b.status === "void").length;

  const winRate = (betsWon / totalBets) * 100;

  const totalStake = bets.reduce(
    (sum, b) => sum.plus(new Decimal(b.stake)),
    new Decimal(0)
  );
  const totalWinAmount = bets.reduce(
    (sum, b) => sum.plus(new Decimal(b.win_amount || 0)),
    new Decimal(0)
  );
  const netGain = bets.reduce(
    (sum, b) => sum.plus(new Decimal(b.net_gain || 0)),
    new Decimal(0)
  );

  const roi = totalStake.isZero()
    ? 0
    : netGain.dividedBy(totalStake).times(100).toNumber();

  const avgBetSize = totalStake.dividedBy(totalBets).toNumber();
  const avgGainPerBet = netGain.dividedBy(totalBets).toNumber();

  const sorted = [...bets].sort((a, b) =>
    new Decimal(b.net_gain || 0).minus(new Decimal(a.net_gain || 0)).toNumber()
  );

  return {
    totalBets,
    betsWon,
    betsLost,
    betsVoid,
    winRate: parseFloat(winRate.toFixed(2)),
    totalStake: totalStake.toNumber(),
    totalWinAmount: totalWinAmount.toNumber(),
    netGain: netGain.toNumber(),
    roi: parseFloat(roi.toFixed(2)),
    avgBetSize: parseFloat(avgBetSize.toFixed(2)),
    avgGainPerBet: parseFloat(avgGainPerBet.toFixed(2)),
    bestBet: sorted[0] || null,
    worstBet: sorted[sorted.length - 1] || null,
  };
}

export function calculateBreakdown(
  bets: BetRow[],
  field: "sport" | "platform" | "bet_type"
): Record<string, { bets: number; netGain: number }> {
  const grouped: Record<string, { bets: number; netGain: Decimal }> = {};

  for (const bet of bets) {
    const key = bet[field] || "Unknown";
    if (!grouped[key]) {
      grouped[key] = { bets: 0, netGain: new Decimal(0) };
    }
    grouped[key].bets++;
    grouped[key].netGain = grouped[key].netGain.plus(new Decimal(bet.net_gain || 0));
  }

  return Object.entries(grouped).reduce(
    (acc, [key, value]) => ({
      ...acc,
      [key]: { bets: value.bets, netGain: parseFloat(value.netGain.toFixed(2)) },
    }),
    {}
  );
}

export interface CumulativePoint {
  date: string;
  ganho: number;
  balance: number;
}

export function calculateCumulative(
  bets: Array<{ result_date: Date; net_gain: string | number | null }>,
  range: DateRange
): CumulativePoint[] {
  const grouped: Record<string, Decimal> = {};

  for (const bet of bets) {
    const dateStr = bet.result_date.toISOString().split("T")[0];
    const netGain = new Decimal(bet.net_gain || 0);
    grouped[dateStr] = (grouped[dateStr] || new Decimal(0)).plus(netGain);
  }

  const result: CumulativePoint[] = [];
  let balance = new Decimal(0);

  const from = new Date(
    Date.UTC(range.from.getUTCFullYear(), range.from.getUTCMonth(), range.from.getUTCDate())
  );
  const to = new Date(
    Date.UTC(range.to.getUTCFullYear(), range.to.getUTCMonth(), range.to.getUTCDate())
  );

  for (let d = new Date(from); d <= to; d.setUTCDate(d.getUTCDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];
    const dailyGain = grouped[dateStr] || new Decimal(0);
    balance = balance.plus(dailyGain);

    result.push({
      date: dateStr,
      ganho: parseFloat(dailyGain.toFixed(2)),
      balance: parseFloat(balance.toFixed(2)),
    });
  }

  return result;
}
