import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authBearer";
import { CashSyncRequest } from "../types/cash";
import { runCashSync } from "../utils/cashStore";

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
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

  if (!Array.isArray(payload.cashEntryChanges)) {
    errors.push("cashEntryChanges must be an array.");
    return errors;
  }

  payload.cashEntryChanges.forEach((change, index) => {
    if (!change || typeof change !== "object") {
      errors.push(`cashEntryChanges[${index}] must be an object.`);
      return;
    }

    if (typeof change.clientId !== "string") {
      errors.push(`cashEntryChanges[${index}].clientId is required.`);
    }

    if (typeof change.entryDate !== "string") {
      errors.push(`cashEntryChanges[${index}].entryDate is required.`);
    }

    if (typeof change.details !== "string" || !change.details.trim()) {
      errors.push(`cashEntryChanges[${index}].details is required.`);
    }

    if (typeof change.credit !== "number" || Number.isNaN(change.credit) || change.credit < 0) {
      errors.push(`cashEntryChanges[${index}].credit must be a valid non-negative number.`);
    }

    if (typeof change.debit !== "number" || Number.isNaN(change.debit) || change.debit < 0) {
      errors.push(`cashEntryChanges[${index}].debit must be a valid non-negative number.`);
    }

    const hasValidSide =
      (change.credit > 0 && change.debit === 0) ||
      (change.debit > 0 && change.credit === 0);

    if (!hasValidSide) {
      errors.push(`cashEntryChanges[${index}] must have exactly one positive side: credit or debit.`);
    }

    if (typeof change.currency !== "string" || !change.currency.trim()) {
      errors.push(`cashEntryChanges[${index}].currency is required.`);
    }

    if (!isIsoDate(change.createdAt)) {
      errors.push(`cashEntryChanges[${index}].createdAt must be a valid ISO string.`);
    }

    if (!isIsoDate(change.updatedAt)) {
      errors.push(`cashEntryChanges[${index}].updatedAt must be a valid ISO string.`);
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

    if (payload.userEmail !== tokenEmail) {
      res.status(403).json({
        error: "Forbidden",
        details: ["Payload userEmail does not match authenticated user."],
      });
      return;
    }

    const result = await runCashSync({
      ...payload,
      userEmail: tokenEmail,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Cash sync failed:", error);
    res.status(500).json({
      error: "Cash sync failed.",
    });
  }
}