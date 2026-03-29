import { Router, Request, Response } from "express";
import { runSync } from "../services/syncService";
import { SyncRequestBody } from "../types/sync";
import { requireBearerToken } from "../middleware/authBearer";

const router = Router();

router.post("/sync", requireBearerToken, async (req: Request, res: Response) => {
  try {
    const body = req.body as SyncRequestBody;

    const response = await runSync({
      lastSyncedAt: body.lastSyncedAt ?? null,
      changes: Array.isArray(body.changes) ? body.changes : [],
      deviceId: body.deviceId ?? null
    });

    return res.status(200).json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown sync error";

    return res.status(400).json({
      error: message
    });
  }
});

export default router;