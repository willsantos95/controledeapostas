import { Request, Response, NextFunction } from "express";
import { verifyToken, AccessTokenPayload } from "../utils/jwt";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        tenant_id: string;
        role: string;
      };
    }
  }
}

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Token não fornecido" });
  }

  try {
    const decoded = verifyToken<AccessTokenPayload>(token);
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      tenant_id: decoded.tenant_id,
      role: decoded.role,
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }
};
