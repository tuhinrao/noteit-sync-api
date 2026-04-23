import { Response } from "express";
import { runNoteSync } from "../utils/noteSyncStore";
import { NoteSyncRequest } from "../types/noteSync";
import { AuthenticatedRequest } from "../middleware/authBearer";

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isNullableIsoDate(value: unknown): boolean {
  return value === null || value === undefined || isIsoDate(value);
}

function validateNoteSyncPayload(body: unknown): string[] {
  const errors: string[] = [];

  if (!body || typeof body !== "object") {
    return ["Request body must be an object."];
  }

  const payload = body as Partial<NoteSyncRequest>;

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

  if (
    payload.noteChanges !== undefined &&
    !Array.isArray(payload.noteChanges)
  ) {
    errors.push("noteChanges must be an array.");
  }

  if (
    payload.categoryChanges !== undefined &&
    !Array.isArray(payload.categoryChanges)
  ) {
    errors.push("categoryChanges must be an array.");
  }

  if (
    payload.tagChanges !== undefined &&
    !Array.isArray(payload.tagChanges)
  ) {
    errors.push("tagChanges must be an array.");
  }

  if (
    payload.noteTagChanges !== undefined &&
    !Array.isArray(payload.noteTagChanges)
  ) {
    errors.push("noteTagChanges must be an array.");
  }

  if (
    payload.noteImageChanges !== undefined &&
    !Array.isArray(payload.noteImageChanges)
  ) {
    errors.push("noteImageChanges must be an array.");
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
        errors.push(
          `noteChanges[${index}].categoryClientId must be null or a string.`
        );
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
        errors.push(
          `noteChanges[${index}].deletedAt must be null or a valid ISO string.`
        );
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
        errors.push(
          `categoryChanges[${index}].createdAt must be a valid ISO string.`
        );
      }

      if (!isIsoDate(change.updatedAt)) {
        errors.push(
          `categoryChanges[${index}].updatedAt must be a valid ISO string.`
        );
      }

      if (!isNullableIsoDate(change.deletedAt)) {
        errors.push(
          `categoryChanges[${index}].deletedAt must be null or a valid ISO string.`
        );
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
        errors.push(
          `tagChanges[${index}].deletedAt must be null or a valid ISO string.`
        );
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
        errors.push(
          `noteTagChanges[${index}].createdAt must be a valid ISO string.`
        );
      }

      if (!isIsoDate(change.updatedAt)) {
        errors.push(
          `noteTagChanges[${index}].updatedAt must be a valid ISO string.`
        );
      }

      if (!isNullableIsoDate(change.deletedAt)) {
        errors.push(
          `noteTagChanges[${index}].deletedAt must be null or a valid ISO string.`
        );
      }
    });
  }

  if (Array.isArray(payload.noteImageChanges)) {
    payload.noteImageChanges.forEach((change, index) => {
      if (!change || typeof change !== "object") {
        errors.push(`noteImageChanges[${index}] must be an object.`);
        return;
      }

      if (typeof change.clientId !== "string") {
        errors.push(`noteImageChanges[${index}].clientId is required.`);
      }

      if (typeof change.noteClientId !== "string") {
        errors.push(`noteImageChanges[${index}].noteClientId is required.`);
      }

      if (
        change.remoteFileKey !== null &&
        change.remoteFileKey !== undefined &&
        typeof change.remoteFileKey !== "string"
      ) {
        errors.push(
          `noteImageChanges[${index}].remoteFileKey must be null or a string.`
        );
      }

      if (typeof change.mimeType !== "string") {
        errors.push(`noteImageChanges[${index}].mimeType must be a string.`);
      }

      if (typeof change.fileName !== "string") {
        errors.push(`noteImageChanges[${index}].fileName must be a string.`);
      }

      if (
        typeof change.fileSizeBytes !== "number" ||
        Number.isNaN(change.fileSizeBytes)
      ) {
        errors.push(
          `noteImageChanges[${index}].fileSizeBytes must be a number.`
        );
      }

      if (
        change.width !== null &&
        change.width !== undefined &&
        typeof change.width !== "number"
      ) {
        errors.push(`noteImageChanges[${index}].width must be null or a number.`);
      }

      if (
        change.height !== null &&
        change.height !== undefined &&
        typeof change.height !== "number"
      ) {
        errors.push(
          `noteImageChanges[${index}].height must be null or a number.`
        );
      }

      if (
        typeof change.sortOrder !== "number" ||
        Number.isNaN(change.sortOrder)
      ) {
        errors.push(`noteImageChanges[${index}].sortOrder must be a number.`);
      }

      if (!isIsoDate(change.createdAt)) {
        errors.push(
          `noteImageChanges[${index}].createdAt must be a valid ISO string.`
        );
      }

      if (!isIsoDate(change.updatedAt)) {
        errors.push(
          `noteImageChanges[${index}].updatedAt must be a valid ISO string.`
        );
      }

      if (!isNullableIsoDate(change.deletedAt)) {
        errors.push(
          `noteImageChanges[${index}].deletedAt must be null or a valid ISO string.`
        );
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
    const errors = validateNoteSyncPayload(req.body);

    if (errors.length > 0) {
      res.status(400).json({
        error: "Invalid note sync payload.",
        details: errors,
      });
      return;
    }

    const rawEmail =
      req.auth?.email ??
      req.auth?.["https://noteit.tuhinrao.com/email"];

    const tokenEmail =
      typeof rawEmail === "string" && rawEmail.trim()
        ? rawEmail.trim().toLowerCase()
        : null;

    if (!tokenEmail) {
      res.status(401).json({
        error: "Unauthorized",
        details: ["Authenticated token does not contain an email claim."],
      });
      return;
    }

    const payload = req.body as Partial<NoteSyncRequest>;

    if (payload.userEmail !== tokenEmail) {
      res.status(403).json({
        error: "Forbidden",
        details: ["Payload userEmail does not match authenticated user."],
      });
      return;
    }

    const result = await runNoteSync({
      userEmail: tokenEmail,
      lastSyncedAt: payload.lastSyncedAt ?? null,
      noteChanges: payload.noteChanges ?? [],
      categoryChanges: payload.categoryChanges ?? [],
      tagChanges: payload.tagChanges ?? [],
      noteTagChanges: payload.noteTagChanges ?? [],
      noteImageChanges: payload.noteImageChanges ?? [],
      deviceId: payload.deviceId ?? null,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Note sync failed:", error);
    res.status(500).json({
      error: "Note sync failed.",
    });
  }
}