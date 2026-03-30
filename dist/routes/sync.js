"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postSync = postSync;
const syncStore_1 = require("../utils/syncStore");
function isIsoDate(value) {
    return typeof value === "string" && !Number.isNaN(Date.parse(value));
}
function validatePayload(body) {
    const errors = [];
    if (!body || typeof body !== "object") {
        return ["Request body must be an object."];
    }
    const payload = body;
    if (!payload.userEmail || typeof payload.userEmail !== "string") {
        errors.push("userEmail is required.");
    }
    if (payload.lastSyncedAt !== undefined &&
        payload.lastSyncedAt !== null &&
        !isIsoDate(payload.lastSyncedAt)) {
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
async function postSync(req, res) {
    try {
        const errors = validatePayload(req.body);
        if (errors.length > 0) {
            res.status(400).json({
                error: "Invalid sync payload.",
                details: errors,
            });
            return;
        }
        const payload = req.body;
        const result = await (0, syncStore_1.runSync)(payload);
        res.status(200).json(result);
    }
    catch (error) {
        console.error("Sync failed:", error);
        res.status(500).json({
            error: "Sync failed.",
        });
    }
}
