import { Request, Response } from "express";
import { runSync } from "../utils/syncStore";
import { SyncRequest } from "../types/sync";

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function validatePayload(body: unknown): string[] {
  const errors: string[] = [];

  if (!body || typeof body !== "object") {
    return ["Request body must be an object."];
  }

  const payload = body as Partial<SyncRequest>;

  if (!payload.userEmail || typeof payload.userEmail !== "string") {
    errors.push("userEmail is required.");
  }

  if (
    payload.lastSyncedAt !== undefined &&
    payload.lastSyncedAt !== null &&
    !isIsoDate(payload.lastSyncedAt)
  ) {
    errors.push("lastSyncedAt must be null or a valid ISO string.");
  }

  if (!Array.isArray(payload.noteChanges)) {
    errors.push("noteChanges must be an array.");
  }

  if (!Array.isArray(payload.categoryChanges)) {
    errors.push("categoryChanges must be an array.");
  }

  if (!Array.isArray(payload.noteCategoryChanges)) {
    errors.push("noteCategoryChanges must be an array.");
  }

  return errors;
}

export async function postSync(req: Request, res: Response): Promise<void> {
  try {
    const errors = validatePayload(req.body);

    if (errors.length > 0) {
      res.status(400).json({
        error: "Invalid sync payload.",
        details: errors,
      });
      return;
    }

    const payload = req.body as SyncRequest;
    const result = await runSync(payload);

    res.status(200).json(result);
  } catch (error) {
    console.error("Sync failed:", error);
    res.status(500).json({
      error: "Sync failed.",
    });
  }
}