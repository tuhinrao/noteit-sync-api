import { Response } from "express";
import { runSync } from "../utils/syncStore";
import { SyncRequest } from "../types/sync";
import { AuthenticatedRequest } from "../middleware/authBearer";

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isNullableIsoDate(value: unknown): boolean {
  return value === null || value === undefined || isIsoDate(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
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

  if (!Array.isArray(payload.tagChanges)) {
    errors.push("tagChanges must be an array.");
  }

  if (!Array.isArray(payload.noteTagChanges)) {
    errors.push("noteTagChanges must be an array.");
  }

  if (Array.isArray(payload.noteChanges)) {
    payload.noteChanges.forEach((change, index) => {
      if (!change || typeof change !== "object") {
        errors.push(`noteChanges[${index}] must be an object.`);
        return;
      }

      if (typeof change.clientId !== "string") {
        errors.push(`noteChanges[${index}].clientId is required.`);
      }

      if (typeof change.title !== "string") {
        errors.push(`noteChanges[${index}].title must be a string.`);
      }

      if (typeof change.body !== "string") {
        errors.push(`noteChanges[${index}].body must be a string.`);
      }

      if (
        change.categoryClientId !== null &&
        change.categoryClientId !== undefined &&
        typeof change.categoryClientId !== "string"
      ) {
        errors.push(`noteChanges[${index}].categoryClientId must be null or a string.`);
      }

      if (typeof change.isPinned !== "boolean") {
        errors.push(`noteChanges[${index}].isPinned must be a boolean.`);
      }

      if (typeof change.isArchived !== "boolean") {
        errors.push(`noteChanges[${index}].isArchived must be a boolean.`);
      }

      if (!isIsoDate(change.createdAt)) {
        errors.push(`noteChanges[${index}].createdAt must be a valid ISO string.`);
      }

      if (!isIsoDate(change.updatedAt)) {
        errors.push(`noteChanges[${index}].updatedAt must be a valid ISO string.`);
      }

      if (!isNullableIsoDate(change.deletedAt)) {
        errors.push(`noteChanges[${index}].deletedAt must be null or a valid ISO string.`);
      }
    });
  }

  if (Array.isArray(payload.categoryChanges)) {
    payload.categoryChanges.forEach((change, index) => {
      if (!change || typeof change !== "object") {
        errors.push(`categoryChanges[${index}] must be an object.`);
        return;
      }

      if (typeof change.clientId !== "string") {
        errors.push(`categoryChanges[${index}].clientId is required.`);
      }

      if (typeof change.name !== "string") {
        errors.push(`categoryChanges[${index}].name must be a string.`);
      }

      if (typeof change.colorHex !== "string") {
        errors.push(`categoryChanges[${index}].colorHex must be a string.`);
      }

      if (!isIsoDate(change.createdAt)) {
        errors.push(`categoryChanges[${index}].createdAt must be a valid ISO string.`);
      }

      if (!isIsoDate(change.updatedAt)) {
        errors.push(`categoryChanges[${index}].updatedAt must be a valid ISO string.`);
      }

      if (!isNullableIsoDate(change.deletedAt)) {
        errors.push(`categoryChanges[${index}].deletedAt must be null or a valid ISO string.`);
      }
    });
  }

  if (Array.isArray(payload.tagChanges)) {
    payload.tagChanges.forEach((change, index) => {
      if (!change || typeof change !== "object") {
        errors.push(`tagChanges[${index}] must be an object.`);
        return;
      }

      if (typeof change.clientId !== "string") {
        errors.push(`tagChanges[${index}].clientId is required.`);
      }

      if (typeof change.name !== "string") {
        errors.push(`tagChanges[${index}].name must be a string.`);
      }

      if (typeof change.colorHex !== "string") {
        errors.push(`tagChanges[${index}].colorHex must be a string.`);
      }

      if (!isIsoDate(change.createdAt)) {
        errors.push(`tagChanges[${index}].createdAt must be a valid ISO string.`);
      }

      if (!isIsoDate(change.updatedAt)) {
        errors.push(`tagChanges[${index}].updatedAt must be a valid ISO string.`);
      }

      if (!isNullableIsoDate(change.deletedAt)) {
        errors.push(`tagChanges[${index}].deletedAt must be null or a valid ISO string.`);
      }
    });
  }

  if (Array.isArray(payload.noteTagChanges)) {
    payload.noteTagChanges.forEach((change, index) => {
      if (!change || typeof change !== "object") {
        errors.push(`noteTagChanges[${index}] must be an object.`);
        return;
      }

      if (typeof change.noteClientId !== "string") {
        errors.push(`noteTagChanges[${index}].noteClientId is required.`);
      }

      if (typeof change.tagClientId !== "string") {
        errors.push(`noteTagChanges[${index}].tagClientId is required.`);
      }

      if (!isIsoDate(change.createdAt)) {
        errors.push(`noteTagChanges[${index}].createdAt must be a valid ISO string.`);
      }

      if (!isIsoDate(change.updatedAt)) {
        errors.push(`noteTagChanges[${index}].updatedAt must be a valid ISO string.`);
      }

      if (!isNullableIsoDate(change.deletedAt)) {
        errors.push(`noteTagChanges[${index}].deletedAt must be null or a valid ISO string.`);
      }
    });
  }

  return errors;
}

export async function postSync(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const errors = validatePayload(req.body);

    if (errors.length > 0) {
      res.status(400).json({
        error: "Invalid sync payload.",
        details: errors,
      });
      return;
    }

    const tokenEmail =
      typeof req.auth?.email === "string" ? req.auth.email : null;

    if (!tokenEmail) {
      res.status(401).json({
        error: "Unauthorized",
        details: ["Authenticated token does not contain an email claim."],
      });
      return;
    }

    const payload = req.body as SyncRequest;

    if (payload.userEmail !== tokenEmail) {
      res.status(403).json({
        error: "Forbidden",
        details: ["Payload userEmail does not match authenticated user."],
      });
      return;
    }

    const result = await runSync({
      ...payload,
      userEmail: tokenEmail,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Sync failed:", error);
    res.status(500).json({
      error: "Sync failed.",
    });
  }
}