import { Router, Request, Response } from "express";
import { pool } from "../db/pool";
import { hashPassword, comparePassword, isValidPassword, isValidEmail } from "../utils/password";
import { generateAccessToken, generateRefreshToken, verifyToken, RefreshTokenPayload } from "../utils/jwt";
import { authMiddleware } from "../middleware/auth";
import { loginLimiter } from "../middleware/rateLimit";
import { AppError } from "../middleware/errorHandler";

const router = Router();

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/auth",
};

function toPublicUser(row: any) {
  return {
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    tenant_id: row.tenant_id,
    role: row.role,
  };
}

router.post("/signup", async (req: Request, res: Response) => {
  const { email, password, full_name } = req.body ?? {};

  if (!email || !password) {
    throw new AppError("Email e senha são obrigatórios", 400);
  }
  if (!isValidEmail(email)) {
    throw new AppError("Email inválido", 400);
  }
  if (!isValidPassword(password)) {
    throw new AppError(
      "Senha deve ter no mínimo 8 caracteres, 1 maiúscula, 1 minúscula e 1 número",
      400
    );
  }

  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.rows.length > 0) {
    throw new AppError("Email já cadastrado", 409);
  }

  const passwordHash = await hashPassword(password);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const tenantResult = await client.query(
      `INSERT INTO tenants (name, subscription_tier) VALUES ($1, 'free') RETURNING id`,
      [`Tenant de ${email}`]
    );
    const tenantId = tenantResult.rows[0].id;

    const userResult = await client.query(
      `INSERT INTO users (tenant_id, email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4, 'owner')
       RETURNING id, email, full_name, tenant_id, role`,
      [tenantId, email, passwordHash, full_name ?? null]
    );

    await client.query("COMMIT");

    const user = userResult.rows[0];
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.cookie("refresh_token", refreshToken, REFRESH_COOKIE_OPTIONS);
    res.status(201).json({
      access_token: accessToken,
      refresh_token: refreshToken,
      user: toPublicUser(user),
    });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

router.post("/login", loginLimiter, async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    throw new AppError("Email e senha são obrigatórios", 400);
  }

  const result = await pool.query(
    "SELECT id, email, password_hash, full_name, tenant_id, role, is_active FROM users WHERE email = $1",
    [email]
  );

  const genericError = () => new AppError("Email ou senha incorretos", 401);

  if (result.rows.length === 0) {
    throw genericError();
  }

  const userRow = result.rows[0];

  const matches = await comparePassword(password, userRow.password_hash);
  if (!matches) {
    throw genericError();
  }

  if (!userRow.is_active) {
    throw new AppError("Conta desativada. Contate suporte", 403);
  }

  await pool.query("UPDATE users SET last_login = NOW() WHERE id = $1", [userRow.id]);

  const accessToken = generateAccessToken(userRow);
  const refreshToken = generateRefreshToken(userRow);

  res.cookie("refresh_token", refreshToken, REFRESH_COOKIE_OPTIONS);
  res.json({
    access_token: accessToken,
    refresh_token: refreshToken,
    user: toPublicUser(userRow),
  });
});

router.post("/logout", authMiddleware, async (_req: Request, res: Response) => {
  res.clearCookie("refresh_token", { path: "/auth" });
  res.json({ success: true });
});

router.get("/refresh", async (req: Request, res: Response) => {
  const token = req.cookies?.refresh_token;

  if (!token) {
    throw new AppError("Refresh token não fornecido", 401);
  }

  let payload: RefreshTokenPayload;
  try {
    payload = verifyToken<RefreshTokenPayload>(token);
  } catch {
    throw new AppError("Refresh token inválido ou expirado", 401);
  }

  if (payload.type !== "refresh") {
    throw new AppError("Token inválido", 401);
  }

  const result = await pool.query(
    "SELECT id, email, full_name, tenant_id, role, is_active FROM users WHERE id = $1",
    [payload.sub]
  );

  if (result.rows.length === 0 || !result.rows[0].is_active) {
    throw new AppError("Usuário não encontrado ou inativo", 401);
  }

  const userRow = result.rows[0];
  const accessToken = generateAccessToken(userRow);
  const refreshToken = generateRefreshToken(userRow);

  res.cookie("refresh_token", refreshToken, REFRESH_COOKIE_OPTIONS);
  res.json({ access_token: accessToken });
});

router.get("/me", authMiddleware, async (req: Request, res: Response) => {
  const result = await pool.query(
    "SELECT id, email, full_name, tenant_id, role FROM users WHERE id = $1",
    [req.user!.id]
  );

  if (result.rows.length === 0) {
    throw new AppError("Usuário não encontrado", 404);
  }

  res.json({ user: toPublicUser(result.rows[0]) });
});

export default router;
