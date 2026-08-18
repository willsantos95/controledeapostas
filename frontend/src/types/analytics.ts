export type Period = "today" | "week" | "month" | "all-time";

export interface BestWorstBet {
  id: string;
  event_description: string | null;
  bet_description: string | null;
  net_gain: string;
}

export interface AnalyticsMetrics {
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
  bestBet: BestWorstBet | null;
  worstBet: BestWorstBet | null;
}

export interface BreakdownEntry {
  bets: number;
  netGain: number;
}

export interface AnalyticsSummary {
  period: Period;
  dateRange: { from: string; to: string };
  metrics: AnalyticsMetrics;
  breakdown: {
    bySport: Record<string, BreakdownEntry>;
    byPlatform: Record<string, BreakdownEntry>;
    byBetType: Record<string, BreakdownEntry>;
  };
}

export interface CumulativePoint {
  date: string;
  ganho: number;
  balance: number;
}
