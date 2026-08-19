import { Router, Request, Response } from "express";
import { pool } from "../db/pool";
import { AppError } from "../middleware/errorHandler";
import { calculateDistribution, DistributionInput } from "../calculators/distribution";
import { calculateFreeBet, FreeBetInput } from "../calculators/freeBet";

const router = Router();

async function logCalculation(
  userId: string,
  calculatorType: "distribution" | "free_bet_converter",
  inputData: unknown,
  outputData: unknown
) {
  await pool.query(
    `INSERT INTO calculator_logs (user_id, calculator_type, input_data, output_data)
     VALUES ($1, $2, $3, $4)`,
    [userId, calculatorType, JSON.stringify(inputData), JSON.stringify(outputData)]
  );
}

router.post("/distribution", async (req: Request, res: Response) => {
  const { legs, anchorStake, anchorIndex } = req.body ?? {};

  if (!Array.isArray(legs) || legs.length < 2) {
    throw new AppError("legs deve ser um array com pelo menos 2 pernas", 400);
  }
  if (anchorStake === undefined) {
    throw new AppError("anchorStake é obrigatório", 400);
  }

  const input: DistributionInput = { legs, anchorStake, anchorIndex };
  const result = calculateDistribution(input);
  await logCalculation(req.user!.id, "distribution", input, result);

  res.json(result);
});

router.post("/free-bet", async (req: Request, res: Response) => {
  const body = req.body ?? {};

  if (body.type !== "simple" && body.type !== "with-lay") {
    throw new AppError("type deve ser 'simple' ou 'with-lay'", 400);
  }
  if (body.freeBetValue === undefined) {
    throw new AppError("freeBetValue é obrigatório", 400);
  }
  if (body.type === "simple" && body.odd === undefined) {
    throw new AppError("odd é obrigatório para type=simple", 400);
  }
  if (
    body.type === "with-lay" &&
    (body.oddBack === undefined || body.oddLay === undefined)
  ) {
    throw new AppError("oddBack e oddLay são obrigatórios para type=with-lay", 400);
  }

  const input = body as FreeBetInput;
  const result = calculateFreeBet(input);
  await logCalculation(req.user!.id, "free_bet_converter", input, result);

  res.json(result);
});

export default router;
