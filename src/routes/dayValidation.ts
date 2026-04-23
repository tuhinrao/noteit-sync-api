import { Response } from "express";
import { runDayValidationSync } from "../utils/dayValidationSyncStore";
import { DayValidationSyncRequest } from "../types/dayValidationSync";
import { AuthenticatedRequest } from "../middleware/authBearer";

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isNullableIsoDate(value: unknown): boolean {
  return value === null || value === undefined || isIsoDate(value);
}

function isDateOnly(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validateDayValidationSyncPayload(body: unknown): string[] {
  const errors: string[] = [];

  if (!body || typeof body !== "object") {
    return ["Request body must be an object."];
  }

  const payload = body as Partial<DayValidationSyncRequest>;

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
    payload.dayValidationChanges !== undefined &&
    !Array.isArray(payload.dayValidationChanges)
  ) {
    errors.push("dayValidationChanges must be an array.");
  }

  if (
    payload.dayValidationTagChanges !== undefined &&
    !Array.isArray(payload.dayValidationTagChanges)
  ) {
    errors.push("dayValidationTagChanges must be an array.");
  }

  if (
    payload.tagChanges !== undefined &&
    !Array.isArray(payload.tagChanges)
  ) {
    errors.push("tagChanges must be an array.");
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

  if (Array.isArray(payload.dayValidationChanges)) {
    payload.dayValidationChanges.forEach((change, index) => {
      if (!change || typeof change !== "object") {
        errors.push(`dayValidationChanges[${index}] must be an object.`);
        return;
      }

      if (typeof change.clientId !== "string") {
        errors.push(`dayValidationChanges[${index}].clientId is required.`);
      }

      if (!isDateOnly(change.validationDate)) {
        errors.push(`dayValidationChanges[${index}].validationDate must be YYYY-MM-DD.`);
      }

      if (typeof change.isValidated !== "boolean") {
        errors.push(`dayValidationChanges[${index}].isValidated must be a boolean.`);
      }

      if (!isNullableIsoDate(change.validatedAt)) {
        errors.push(
          `dayValidationChanges[${index}].validatedAt must be null or a valid ISO string.`
        );
      }

      if (typeof change.note !== "string") {
        errors.push(`dayValidationChanges[${index}].note must be a string.`);
      }

      if (!isIsoDate(change.createdAt)) {
        errors.push(
          `dayValidationChanges[${index}].createdAt must be a valid ISO string.`
        );
      }

      if (!isIsoDate(change.updatedAt)) {
        errors.push(
          `dayValidationChanges[${index}].updatedAt must be a valid ISO string.`
        );
      }

      if (!isNullableIsoDate(change.deletedAt)) {
        errors.push(
          `dayValidationChanges[${index}].deletedAt must be null or a valid ISO string.`
        );
      }
    });
  }

  if (Array.isArray(payload.dayValidationTagChanges)) {
    payload.dayValidationTagChanges.forEach((change, index) => {
      if (!change || typeof change !== "object") {
        errors.push(`dayValidationTagChanges[${index}] must be an object.`);
        return;
      }

      if (typeof change.dayValidationClientId !== "string") {
        errors.push(`dayValidationTagChanges[${index}].dayValidationClientId is required.`);
      }

      if (typeof change.tagClientId !== "string") {
        errors.push(`dayValidationTagChanges[${index}].tagClientId is required.`);
      }

      if (!isIsoDate(change.createdAt)) {
        errors.push(
          `dayValidationTagChanges[${index}].createdAt must be a valid ISO string.`
        );
      }

      if (!isIsoDate(change.updatedAt)) {
        errors.push(
          `dayValidationTagChanges[${index}].updatedAt must be a valid ISO string.`
        );
      }

      if (!isNullableIsoDate(change.deletedAt)) {
        errors.push(
          `dayValidationTagChanges[${index}].deletedAt must be null or a valid ISO string.`
        );
      }
    });
  }

  return errors;
}

export async function postDayValidationSync(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const errors = validateDayValidationSyncPayload(req.body);

    if (errors.length > 0) {
      res.status(400).json({
        error: "Invalid day validation sync payload.",
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

    const payload = req.body as Partial<DayValidationSyncRequest>;

    if (payload.userEmail !== tokenEmail) {
      res.status(403).json({
        error: "Forbidden",
        details: ["Payload userEmail does not match authenticated user."],
      });
      return;
    }

    const result = await runDayValidationSync({
      userEmail: tokenEmail,
      lastSyncedAt: payload.lastSyncedAt ?? null,
      dayValidationChanges: payload.dayValidationChanges ?? [],
      dayValidationTagChanges: payload.dayValidationTagChanges ?? [],
      tagChanges: payload.tagChanges ?? [],
      deviceId: payload.deviceId ?? null,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Day validation sync failed:", error);
    res.status(500).json({
      error: "Day validation sync failed.",
    });
  }
}