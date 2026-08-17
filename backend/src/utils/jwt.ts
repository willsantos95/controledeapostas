import jwt from "jsonwebtoken";

export interface AuthUser {
  id: string;
  email: string;
  tenant_id: string;
  role: string;
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
  tenant_id: string;
  role: string;
}

export interface RefreshTokenPayload {
  sub: string;
  type: "refresh";
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET não configurado");
  return secret;
}

export const generateAccessToken = (user: AuthUser): string => {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      tenant_id: user.tenant_id,
      role: user.role || "user",
    },
    getSecret(),
    { expiresIn: (process.env.JWT_ACCESS_EXPIRY || "15m") as jwt.SignOptions["expiresIn"] }
  );
};

export const generateRefreshToken = (user: AuthUser): string => {
  return jwt.sign(
    {
      sub: user.id,
      type: "refresh",
    },
    getSecret(),
    { expiresIn: (process.env.JWT_REFRESH_EXPIRY || "7d") as jwt.SignOptions["expiresIn"] }
  );
};

export const verifyToken = <T extends object = any>(token: string): T => {
  try {
    return jwt.verify(token, getSecret()) as T;
  } catch (err) {
    throw new Error("Invalid token");
  }
};
