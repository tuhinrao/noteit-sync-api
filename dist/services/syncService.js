"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSync = runSync;
const pool_1 = require("../db/pool");
const notes_1 = require("../db/notes");
const time_1 = require("../utils/time");
function validateNote(note) {
    if (!note.clientId || typeof note.clientId !== "string") {
        throw new Error("Invalid clientId");
    }
    if (typeof note.title !== "string") {
        throw new Error(`Invalid title for ${note.clientId}`);
    }
    if (typeof note.body !== "string") {
        throw new Error(`Invalid body for ${note.clientId}`);
    }
    if (typeof note.isPinned !== "boolean") {
        throw new Error(`Invalid isPinned for ${note.clientId}`);
    }
    if (typeof note.isArchived !== "boolean") {
        throw new Error(`Invalid isArchived for ${note.clientId}`);
    }
    if (!(0, time_1.isValidIsoDate)(note.createdAt)) {
        throw new Error(`Invalid createdAt for ${note.clientId}`);
    }
    if (!(0, time_1.isValidIsoDate)(note.updatedAt)) {
        throw new Error(`Invalid updatedAt for ${note.clientId}`);
    }
    if (note.deletedAt !== null && !(0, time_1.isValidIsoDate)(note.deletedAt)) {
        throw new Error(`Invalid deletedAt for ${note.clientId}`);
    }
}
async function runSync(input) {
    if (!input.userEmail || typeof input.userEmail !== "string") {
        throw new Error("Invalid userEmail");
    }
    if (input.lastSyncedAt !== null && input.lastSyncedAt !== undefined) {
        if (!(0, time_1.isValidIsoDate)(input.lastSyncedAt)) {
            throw new Error("Invalid lastSyncedAt");
        }
    }
    const client = await pool_1.pool.connect();
    try {
        await client.query("BEGIN");
        for (const incoming of input.noteChanges) {
            validateNote(incoming);
            const existing = await (0, notes_1.findNoteByClientId)(client, input.userEmail, incoming.clientId);
            if (!existing) {
                await (0, notes_1.insertNote)(client, input.userEmail, incoming, input.deviceId ?? null);
                continue;
            }
            const serverUpdatedAt = new Date(existing.updated_at).getTime();
            const incomingUpdatedAt = new Date(incoming.updatedAt).getTime();
            // last write wins
            if (incomingUpdatedAt > serverUpdatedAt) {
                await (0, notes_1.updateNote)(client, input.userEmail, incoming, input.deviceId ?? null);
            }
        }
        const serverChanges = await (0, notes_1.fetchServerChangesSince)(client, input.userEmail, input.lastSyncedAt ?? null);
        const serverTimeResult = await client.query(`SELECT NOW() AS now`);
        await client.query("COMMIT");
        return {
            serverTime: serverTimeResult.rows[0].now.toISOString(),
            noteChanges: serverChanges,
            categoryChanges: [],
            noteCategoryChanges: [],
        };
    }
    catch (error) {
        await client.query("ROLLBACK");
        throw error;
    }
    finally {
        client.release();
    }
}
