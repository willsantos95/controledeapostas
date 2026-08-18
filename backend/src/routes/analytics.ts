import { Router, Request, Response } from "express";
import { pool } from "../db/pool";
import { AppError } from "../middleware/errorHandler";
import {
  Period,
  getDateRange,
  calculateMetrics,
  calculateBreakdown,
  calculateCumulative,
} from "../utils/analytics";

const router = Router();

const VALID_PERIODS: Period[] = ["today", "week", "month", "all-time"];

function parsePeriod(value: unknown): Period {
  const period = String(value ?? "month");
  if (!VALID_PERIODS.includes(period as Period)) {
    throw new AppError("period inválido. Use today, week, month ou all-time", 400);
  }
  return period as Period;
}

router.get("/summary", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const period = parsePeriod(req.query.period);
  const sport = req.query.sport as string | undefined;
  const range = getDateRange(period);

  const conditions = [
    "user_id = $1",
    "result_date IS NOT NULL",
    "result_date >= $2",
    "result_date <= $3",
  ];
  const params: any[] = [userId, range.from, range.to];

  if (sport) {
    params.push(sport);
    conditions.push(`sport = $${params.length}`);
  }

  const result = await pool.query(
    `SELECT id, stake, win_amount, net_gain, status, sport, platform, bet_type,
            event_description, bet_description
     FROM bets WHERE ${conditions.join(" AND ")}`,
    params
  );

  const bets = result.rows;
  const metrics = calculateMetrics(bets);
  const breakdown = {
    bySport: calculateBreakdown(bets, "sport"),
    byPlatform: calculateBreakdown(bets, "platform"),
    byBetType: calculateBreakdown(bets, "bet_type"),
  };

  res.json({
    period,
    dateRange: { from: range.from, to: range.to },
    metrics,
    breakdown,
  });
});

router.get("/cumulative", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const period = parsePeriod(req.query.period);
  const range = getDateRange(period);

  const result = await pool.query(
    `SELECT result_date, net_gain FROM bets
     WHERE user_id = $1 AND result_date IS NOT NULL
       AND result_date >= $2 AND result_date <= $3
     ORDER BY result_date`,
    [userId, range.from, range.to]
  );

  const series = calculateCumulative(result.rows, range);

  res.json(series);
});

export default router;
