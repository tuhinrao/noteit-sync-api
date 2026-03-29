import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";

export function requireBearerToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authorization = req.header("authorization");

  if (!authorization) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token || token !== env.syncAccessToken) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}