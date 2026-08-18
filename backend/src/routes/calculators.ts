import { Router, Request, Response } from "express";
import { pool } from "../db/pool";
import { AppError } from "../middleware/errorHandler";
import { calculateSurebet } from "../calculators/surebet";
import { calculateDuploGreen } from "../calculators/duploGreen";
import { calculateFreeBet, FreeBetInput } from "../calculators/freeBet";

const router = Router();

async function logCalculation(
  userId: string,
  calculatorType: "surebet_2way" | "duplo_green_3way" | "free_bet_converter",
  inputData: unknown,
  outputData: unknown
) {
  await pool.query(
    `INSERT INTO calculator_logs (user_id, calculator_type, input_data, output_data)
     VALUES ($1, $2, $3, $4)`,
    [userId, calculatorType, JSON.stringify(inputData), JSON.stringify(outputData)]
  );
}

router.post("/surebet", async (req: Request, res: Response) => {
  const { odd1, odd2, stake1 } = req.body ?? {};

  if (odd1 === undefined || odd2 === undefined || stake1 === undefined) {
    throw new AppError("odd1, odd2 e stake1 são obrigatórios", 400);
  }

  const result = calculateSurebet({ odd1, odd2, stake1 });
  await logCalculation(req.user!.id, "surebet_2way", { odd1, odd2, stake1 }, result);

  res.json(result);
});

router.post("/duplo-green", async (req: Request, res: Response) => {
  const { odd1, oddX, odd2, stakeInitial } = req.body ?? {};

  if (
    odd1 === undefined ||
    oddX === undefined ||
    odd2 === undefined ||
    stakeInitial === undefined
  ) {
    throw new AppError("odd1, oddX, odd2 e stakeInitial são obrigatórios", 400);
  }

  const result = calculateDuploGreen({ odd1, oddX, odd2, stakeInitial });
  await logCalculation(
    req.user!.id,
    "duplo_green_3way",
    { odd1, oddX, odd2, stakeInitial },
    result
  );

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
