import { describe, it, expect } from "vitest";
import {
  calculateMetrics,
  calculateBreakdown,
  calculateCumulative,
  getDateRange,
  BetRow,
} from "../utils/analytics";

const bet = (overrides: Partial<BetRow>): BetRow => ({
  id: "id",
  stake: "100",
  win_amount: null,
  net_gain: null,
  status: "won",
  sport: "Futebol",
  platform: "Bet365",
  bet_type: "single",
  event_description: null,
  bet_description: null,
  ...overrides,
});

describe("calculateMetrics", () => {
  it("returns zeroed metrics for empty input", () => {
    const metrics = calculateMetrics([]);
    expect(metrics.totalBets).toBe(0);
    expect(metrics.bestBet).toBeNull();
    expect(metrics.worstBet).toBeNull();
  });

  it("calculates net gain, win rate and roi", () => {
    const bets = [
      bet({ status: "won", stake: "100", win_amount: "250", net_gain: "150" }),
      bet({ status: "lost", stake: "100", win_amount: "0", net_gain: "-100" }),
      bet({ status: "won", stake: "50", win_amount: "100", net_gain: "50" }),
    ];

    const metrics = calculateMetrics(bets);

    expect(metrics.totalBets).toBe(3);
    expect(metrics.betsWon).toBe(2);
    expect(metrics.betsLost).toBe(1);
    expect(metrics.netGain).toBe(100);
    expect(metrics.totalStake).toBe(250);
    expect(metrics.roi).toBe(40);
    expect(metrics.winRate).toBeCloseTo(66.67, 1);
  });

  it("identifies best and worst bets", () => {
    const bets = [
      bet({ id: "a", net_gain: "150" }),
      bet({ id: "b", net_gain: "-200" }),
      bet({ id: "c", net_gain: "50" }),
    ];

    const metrics = calculateMetrics(bets);
    expect(metrics.bestBet?.id).toBe("a");
    expect(metrics.worstBet?.id).toBe("b");
  });
});

describe("calculateBreakdown", () => {
  it("groups by field and sums net_gain", () => {
    const bets = [
      bet({ sport: "Futebol", net_gain: "100" }),
      bet({ sport: "Futebol", net_gain: "50" }),
      bet({ sport: "Tênis", net_gain: "-20" }),
    ];

    const breakdown = calculateBreakdown(bets, "sport");

    expect(breakdown["Futebol"]).toEqual({ bets: 2, netGain: 150 });
    expect(breakdown["Tênis"]).toEqual({ bets: 1, netGain: -20 });
  });
});

describe("calculateCumulative", () => {
  it("produces a running balance across the date range", () => {
    const range = { from: new Date("2026-08-01"), to: new Date("2026-08-03") };
    const bets = [
      { result_date: new Date("2026-08-01"), net_gain: "100" },
      { result_date: new Date("2026-08-03"), net_gain: "-30" },
    ];

    const series = calculateCumulative(bets, range);

    expect(series).toHaveLength(3);
    expect(series[0]).toEqual({ date: "2026-08-01", ganho: 100, balance: 100 });
    expect(series[1]).toEqual({ date: "2026-08-02", ganho: 0, balance: 100 });
    expect(series[2]).toEqual({ date: "2026-08-03", ganho: -30, balance: 70 });
  });
});

describe("getDateRange", () => {
  it("returns start of month for period=month", () => {
    const now = new Date("2026-08-18T12:00:00Z");
    const range = getDateRange("month", now);
    expect(range.from.getUTCDate()).toBe(1);
    expect(range.to).toBe(now);
  });

  it("returns epoch for all-time", () => {
    const range = getDateRange("all-time");
    expect(range.from.getUTCFullYear()).toBe(1970);
  });
});
