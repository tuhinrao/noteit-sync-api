import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";

export interface AuthenticatedRequest extends Request {
  auth?: Record<string, unknown>;
}

const issuer = `https://${env.auth0.domain}/`;
const jwksUrl = `${issuer}.well-known/jwks.json`;

let jwks: unknown = null;

export async function requireBearerToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authorization = req.header("authorization");

    if (!authorization) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const jose = await import("jose");

    if (!jwks) {
      jwks = jose.createRemoteJWKSet(new URL(jwksUrl));
    }

    const { payload } = await jose.jwtVerify(token, jwks as ReturnType<typeof jose.createRemoteJWKSet>, {
      issuer,
      audience: env.auth0.audience,
    });

    req.auth = payload as Record<string, unknown>;
    next();
  } catch (error) {
    console.error("JWT validation failed:", error);
    res.status(401).json({ error: "Unauthorized" });
  }
}