import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authBearer";
import { CashSyncRequest } from "../types/cash";
import { runCashSync } from "../utils/cashStore";

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isDateOnly(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))
  );
}

function validateCashPayload(body: unknown): string[] {
  const errors: string[] = [];

  if (!body || typeof body !== "object") {
    return ["Request body must be an object."];
  }

  const payload = body as Partial<CashSyncRequest>;

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
    payload.deviceId !== undefined &&
    payload.deviceId !== null &&
    typeof payload.deviceId !== "string"
  ) {
    errors.push("deviceId must be a string or null.");
  }

  if (
    payload.cashEntryChanges !== undefined &&
    !Array.isArray(payload.cashEntryChanges)
  ) {
    errors.push("cashEntryChanges must be an array if provided.");
    return errors;
  }

  const changes = payload.cashEntryChanges ?? [];

  changes.forEach((change, index) => {
    if (!change || typeof change !== "object") {
      errors.push(`cashEntryChanges[${index}] must be an object.`);
      return;
    }

    if (typeof change.clientId !== "string" || !change.clientId.trim()) {
      errors.push(`cashEntryChanges[${index}].clientId is required.`);
    }

    if (!isDateOnly(change.entryDate)) {
      errors.push(
        `cashEntryChanges[${index}].entryDate must be a valid YYYY-MM-DD string.`
      );
    }

    if (typeof change.details !== "string" || !change.details.trim()) {
      errors.push(`cashEntryChanges[${index}].details is required.`);
    }

    if (
      typeof change.credit !== "number" ||
      Number.isNaN(change.credit) ||
      change.credit < 0
    ) {
      errors.push(
        `cashEntryChanges[${index}].credit must be a valid non-negative number.`
      );
    }

    if (
      typeof change.debit !== "number" ||
      Number.isNaN(change.debit) ||
      change.debit < 0
    ) {
      errors.push(
        `cashEntryChanges[${index}].debit must be a valid non-negative number.`
      );
    }

    const hasValidSide =
      (change.credit > 0 && change.debit === 0) ||
      (change.debit > 0 && change.credit === 0);

    if (!hasValidSide) {
      errors.push(
        `cashEntryChanges[${index}] must have exactly one positive side: credit or debit.`
      );
    }

    if (typeof change.currency !== "string" || !change.currency.trim()) {
      errors.push(`cashEntryChanges[${index}].currency is required.`);
    }

    if (!isIsoDate(change.createdAt)) {
      errors.push(
        `cashEntryChanges[${index}].createdAt must be a valid ISO string.`
      );
    }

    if (!isIsoDate(change.updatedAt)) {
      errors.push(
        `cashEntryChanges[${index}].updatedAt must be a valid ISO string.`
      );
    }

    if (
      change.deletedAt !== null &&
      change.deletedAt !== undefined &&
      !isIsoDate(change.deletedAt)
    ) {
      errors.push(
        `cashEntryChanges[${index}].deletedAt must be null or a valid ISO string.`
      );
    }

    if (
      isIsoDate(change.createdAt) &&
      isIsoDate(change.updatedAt) &&
      new Date(change.updatedAt).getTime() < new Date(change.createdAt).getTime()
    ) {
      errors.push(
        `cashEntryChanges[${index}].updatedAt cannot be earlier than createdAt.`
      );
    }

    if (
      change.deletedAt &&
      isIsoDate(change.updatedAt) &&
      isIsoDate(change.deletedAt) &&
      new Date(change.deletedAt).getTime() < new Date(change.updatedAt).getTime()
    ) {
      errors.push(
        `cashEntryChanges[${index}].deletedAt cannot be earlier than updatedAt.`
      );
    }
  });

  return errors;
}

export async function postCashSync(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const errors = validateCashPayload(req.body);

    if (errors.length > 0) {
      res.status(400).json({
        error: "Invalid cash sync payload.",
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

    const payload = req.body as CashSyncRequest;

    if (payload.userEmail.trim().toLowerCase() !== tokenEmail) {
      res.status(403).json({
        error: "Forbidden",
        details: ["Payload userEmail does not match authenticated user."],
      });
      return;
    }

    const result = await runCashSync({
      ...payload,
      userEmail: tokenEmail,
      cashEntryChanges: payload.cashEntryChanges ?? [],
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Cash sync failed:", error);
    res.status(500).json({
      error: "Cash sync failed.",
    });
  }
}