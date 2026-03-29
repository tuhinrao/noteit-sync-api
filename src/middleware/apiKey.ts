// import { Request, Response, NextFunction } from "express";
// import { env } from "../config/env";

// export function requireApiKey(
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): void {
//   const apiKey = req.header("x-api-key");

//   if (!apiKey || apiKey !== env.syncApiKey) {
//     res.status(401).json({
//       error: "Unauthorized"
//     });
//     return;
//   }

//   next();
// }