export type BetType = "single" | "parlay" | "multiple" | "system" | "free";
export type BetStatus = "pending" | "won" | "lost" | "void" | "canceled";

export interface Bet {
  id: string;
  user_id: string;
  bet_id: string;
  platform: string | null;
  stake: string;
  initial_odds: string;
  bet_type: BetType;
  sport: string | null;
  event_description: string | null;
  bet_description: string | null;
  status: BetStatus;
  result_odd: string | null;
  win_amount: string | null;
  net_gain: string | null;
  result_date: string | null;
  screenshot_urls: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
