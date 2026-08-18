import { Router, Request, Response } from "express";
import multer from "multer";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import Decimal from "decimal.js";
import { pool } from "../db/pool";
import { AppError } from "../middleware/errorHandler";
import { s3Client, S3_BUCKET, isS3Configured } from "../config/s3";
import { calculateBetResult, BetResultStatus } from "../utils/betResult";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Apenas imagens são permitidas"));
    }
    cb(null, true);
  },
});

function keyFromUrl(url: string): string | null {
  const marker = `${S3_BUCKET}/`;
  const idx = url.indexOf(marker);
  return idx === -1 ? null : url.slice(idx + marker.length);
}

router.post(
  "/upload-screenshot",
  upload.single("file"),
  async (req: Request, res: Response) => {
    if (!isS3Configured) {
      throw new AppError(
        "Upload de screenshots não está configurado neste ambiente. Configure as variáveis S3_* para habilitar.",
        503
      );
    }
    if (!req.file) {
      throw new AppError("Arquivo não enviado", 400);
    }

    const userId = req.user!.id;
    const tempId = uuidv4();

    const optimized = await sharp(req.file.buffer)
      .resize(2000, 2000, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    const key = `user-${userId}/screenshots/${tempId}.webp`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: optimized,
        ContentType: "image/webp",
      })
    );

    const url = `${process.env.S3_ENDPOINT}/${S3_BUCKET}/${key}`;

    res.status(201).json({
      url,
      tempId,
      size: optimized.length,
      uploadedAt: new Date(),
    });
  }
);

router.post("/", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const {
    bet_id,
    platform,
    stake,
    initial_odds,
    bet_type,
    sport,
    event_description,
    bet_description,
    notes,
    screenshot_urls,
  } = req.body ?? {};

  if (!bet_id || String(bet_id).trim() === "") {
    throw new AppError("bet_id é obrigatório", 400);
  }
  if (stake === undefined || new Decimal(stake).lessThanOrEqualTo(0)) {
    throw new AppError("stake deve ser > 0", 400);
  }
  if (initial_odds === undefined || new Decimal(initial_odds).lessThan(1)) {
    throw new AppError("initial_odds deve ser >= 1.0", 400);
  }

  const result = await pool.query(
    `INSERT INTO bets (
       user_id, bet_id, platform, stake, initial_odds,
       bet_type, sport, event_description, bet_description,
       screenshot_urls, notes, status
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending')
     RETURNING *`,
    [
      userId,
      bet_id,
      platform || null,
      new Decimal(stake).toString(),
      new Decimal(initial_odds).toString(),
      bet_type || "single",
      sport || null,
      event_description || null,
      bet_description || null,
      screenshot_urls || [],
      notes || null,
    ]
  );

  res.status(201).json(result.rows[0]);
});

router.get("/", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { status, sport, sort = "-created_at" } = req.query;

  const limit = Math.min(parseInt(String(req.query.limit ?? "20"), 10) || 20, 100);
  const offset = Math.max(parseInt(String(req.query.offset ?? "0"), 10) || 0, 0);

  const conditions = ["user_id = $1"];
  const params: any[] = [userId];

  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }
  if (sport) {
    params.push(sport);
    conditions.push(`sport = $${params.length}`);
  }

  const allowedSortFields = new Set([
    "created_at",
    "stake",
    "initial_odds",
    "net_gain",
    "result_date",
  ]);
  const rawSort = String(sort);
  const descending = rawSort.startsWith("-");
  const sortField = descending ? rawSort.slice(1) : rawSort;
  const orderBy = allowedSortFields.has(sortField) ? sortField : "created_at";
  const orderDirection = descending ? "DESC" : "ASC";

  const whereClause = conditions.join(" AND ");

  const dataResult = await pool.query(
    `SELECT * FROM bets WHERE ${whereClause} ORDER BY ${orderBy} ${orderDirection} LIMIT $${
      params.length + 1
    } OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  const totalResult = await pool.query(
    `SELECT COUNT(*) FROM bets WHERE ${whereClause}`,
    params
  );

  res.json({
    bets: dataResult.rows,
    total: parseInt(totalResult.rows[0].count, 10),
    limit,
    offset,
  });
});

router.get("/:betId", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { betId } = req.params;

  const result = await pool.query(
    "SELECT * FROM bets WHERE id = $1 AND user_id = $2",
    [betId, userId]
  );

  if (result.rows.length === 0) {
    throw new AppError("Aposta não encontrada", 404);
  }

  res.json(result.rows[0]);
});

router.put("/:betId", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { betId } = req.params;

  const checkResult = await pool.query(
    "SELECT * FROM bets WHERE id = $1 AND user_id = $2",
    [betId, userId]
  );

  if (checkResult.rows.length === 0) {
    throw new AppError("Aposta não encontrada", 404);
  }

  const bet = checkResult.rows[0];
  if (bet.status !== "pending") {
    throw new AppError("Não pode editar aposta após resultado ser registrado", 400);
  }

  const allowedFields = [
    "stake",
    "initial_odds",
    "bet_description",
    "notes",
    "screenshot_urls",
  ];

  const updates: Record<string, any> = {};
  for (const field of allowedFields) {
    if (field in (req.body ?? {})) {
      if (field === "stake" || field === "initial_odds") {
        const value = new Decimal(req.body[field]);
        const min = field === "stake" ? 0 : 1;
        if (field === "stake" ? value.lessThanOrEqualTo(0) : value.lessThan(min)) {
          throw new AppError(
            `${field} deve ser ${field === "stake" ? "> 0" : ">= 1.0"}`,
            400
          );
        }
        updates[field] = value.toString();
      } else {
        updates[field] = req.body[field];
      }
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("Nenhum campo para atualizar", 400);
  }

  const setClause = Object.keys(updates)
    .map((key, i) => `${key} = $${i + 1}`)
    .join(", ");

  const result = await pool.query(
    `UPDATE bets SET ${setClause}, updated_at = NOW() WHERE id = $${
      Object.keys(updates).length + 1
    } RETURNING *`,
    [...Object.values(updates), betId]
  );

  res.json(result.rows[0]);
});

router.post(
  "/:betId/result",
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { betId } = req.params;
    const { status, result_odd, win_amount, screenshot_urls, notes } =
      req.body ?? {};

    const checkResult = await pool.query(
      "SELECT * FROM bets WHERE id = $1 AND user_id = $2",
      [betId, userId]
    );

    if (checkResult.rows.length === 0) {
      throw new AppError("Aposta não encontrada", 404);
    }

    const bet = checkResult.rows[0];
    if (bet.status !== "pending") {
      throw new AppError("Esta aposta já tem resultado registrado", 400);
    }

    const validStatuses: BetResultStatus[] = ["won", "lost", "void", "canceled"];
    if (!validStatuses.includes(status)) {
      throw new AppError("Status inválido", 400);
    }

    let calculation;
    try {
      calculation = calculateBetResult({
        status,
        stake: bet.stake,
        resultOdd: result_odd,
        winAmount: win_amount,
      });
    } catch (err) {
      throw new AppError((err as Error).message, 400);
    }

    const result = await pool.query(
      `UPDATE bets
       SET status = $1,
           result_odd = $2,
           win_amount = $3,
           net_gain = $4,
           result_date = NOW(),
           screenshot_urls = COALESCE($5, screenshot_urls),
           notes = COALESCE($6, notes),
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [
        status,
        calculation.resultOdd?.toString() ?? null,
        calculation.winAmount.toString(),
        calculation.netGain.toString(),
        screenshot_urls || null,
        notes || null,
        betId,
      ]
    );

    res.json(result.rows[0]);
  }
);

interface CalculatorBetInput {
  bet_id: string;
  platform?: string;
  stake: string;
  initial_odds: string;
  bet_type: string;
  sport?: string;
  event_description?: string;
  bet_description?: string;
  notes?: string;
}

async function insertBet(userId: string, input: CalculatorBetInput) {
  const result = await pool.query(
    `INSERT INTO bets (
       user_id, bet_id, platform, stake, initial_odds,
       bet_type, sport, event_description, bet_description, notes, status
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
     RETURNING *`,
    [
      userId,
      input.bet_id,
      input.platform || null,
      input.stake,
      input.initial_odds,
      input.bet_type,
      input.sport || null,
      input.event_description || null,
      input.bet_description || null,
      input.notes || null,
    ]
  );
  return result.rows[0];
}

router.post("/from-calculator", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const {
    calculator_type,
    calculator_data,
    calculator_log_id,
    platform,
    event_description,
    notes,
  } = req.body ?? {};

  if (!calculator_type || !calculator_data) {
    throw new AppError("calculator_type e calculator_data são obrigatórios", 400);
  }

  const betIdPrefix = `CALC-${Date.now()}`;
  let createdBets;

  if (calculator_type === "surebet_2way") {
    const { stake1, stake2 } = calculator_data;
    if (!stake1 || !stake2) {
      throw new AppError("calculator_data inválido para surebet_2way", 400);
    }
    createdBets = await Promise.all([
      insertBet(userId, {
        bet_id: `${betIdPrefix}-1`,
        platform,
        stake: String(stake1),
        initial_odds: String(calculator_data.odd1 ?? calculator_data.stake1),
        bet_type: "single",
        event_description,
        bet_description: "Perna 1 - Surebet",
        notes,
      }),
      insertBet(userId, {
        bet_id: `${betIdPrefix}-2`,
        platform,
        stake: String(stake2),
        initial_odds: String(calculator_data.odd2 ?? calculator_data.stake2),
        bet_type: "single",
        event_description,
        bet_description: "Perna 2 - Surebet",
        notes,
      }),
    ]);
  } else if (calculator_type === "duplo_green_3way") {
    const { stake1, stakeX, stake2 } = calculator_data;
    if (!stake1 || !stakeX || !stake2) {
      throw new AppError("calculator_data inválido para duplo_green_3way", 400);
    }
    createdBets = await Promise.all([
      insertBet(userId, {
        bet_id: `${betIdPrefix}-1`,
        platform,
        stake: String(stake1),
        initial_odds: "1",
        bet_type: "single",
        event_description,
        bet_description: "Casa - Duplo Green",
        notes,
      }),
      insertBet(userId, {
        bet_id: `${betIdPrefix}-X`,
        platform,
        stake: String(stakeX),
        initial_odds: "1",
        bet_type: "single",
        event_description,
        bet_description: "Empate - Duplo Green",
        notes,
      }),
      insertBet(userId, {
        bet_id: `${betIdPrefix}-2`,
        platform,
        stake: String(stake2),
        initial_odds: "1",
        bet_type: "single",
        event_description,
        bet_description: "Fora - Duplo Green",
        notes,
      }),
    ]);
  } else if (calculator_type === "free_bet_converter") {
    const { recommendedStake } = calculator_data;
    if (!recommendedStake) {
      throw new AppError("calculator_data inválido para free_bet_converter", 400);
    }
    createdBets = [
      await insertBet(userId, {
        bet_id: betIdPrefix,
        platform,
        stake: String(recommendedStake),
        initial_odds: "1",
        bet_type: "free",
        event_description,
        bet_description: "Aposta Grátis",
        notes,
      }),
    ];
  } else {
    throw new AppError("calculator_type inválido", 400);
  }

  if (calculator_log_id) {
    await pool.query(
      `UPDATE calculator_logs SET is_saved = true, bet_id = $1 WHERE id = $2 AND user_id = $3`,
      [createdBets[0].id, calculator_log_id, userId]
    );
  }

  res.status(201).json(createdBets.length === 1 ? createdBets[0] : createdBets);
});

router.delete("/:betId", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { betId } = req.params;

  const checkResult = await pool.query(
    "SELECT screenshot_urls FROM bets WHERE id = $1 AND user_id = $2",
    [betId, userId]
  );

  if (checkResult.rows.length === 0) {
    throw new AppError("Aposta não encontrada", 404);
  }

  const urls: string[] = checkResult.rows[0].screenshot_urls || [];
  for (const url of urls) {
    const key = keyFromUrl(url);
    if (!key) continue;
    try {
      await s3Client.send(
        new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key })
      );
    } catch (err) {
      console.error(`Falha ao deletar ${url}:`, err);
    }
  }

  await pool.query("DELETE FROM bets WHERE id = $1", [betId]);

  res.status(204).send();
});

export default router;
