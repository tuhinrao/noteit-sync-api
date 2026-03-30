"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapRowToSyncChange = mapRowToSyncChange;
exports.findNoteByClientId = findNoteByClientId;
exports.insertNote = insertNote;
exports.updateNote = updateNote;
exports.fetchServerChangesSince = fetchServerChangesSince;
const time_1 = require("../utils/time");
function mapRowToSyncChange(row) {
    return {
        clientId: row.client_id,
        title: row.title,
        body: row.body,
        isPinned: row.is_pinned,
        isArchived: row.is_archived,
        createdAt: (0, time_1.toIsoString)(row.created_at),
        updatedAt: (0, time_1.toIsoString)(row.updated_at),
        deletedAt: (0, time_1.toIsoString)(row.deleted_at),
    };
}
async function findNoteByClientId(client, userEmail, clientId) {
    const result = await client.query(`
    SELECT
      client_id,
      user_email,
      title,
      body,
      is_pinned,
      is_archived,
      created_at,
      updated_at,
      deleted_at
    FROM notes
    WHERE user_email = $1
      AND client_id = $2
    LIMIT 1
    `, [userEmail, clientId]);
    return result.rows[0] ?? null;
}
async function insertNote(client, userEmail, note, deviceId) {
    await client.query(`
    INSERT INTO notes (
      client_id,
      user_email,
      title,
      body,
      is_pinned,
      is_archived,
      created_at,
      updated_at,
      deleted_at,
      sync_status,
      last_synced_at,
      last_updated_by_device
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      $7::timestamptz,
      $8::timestamptz,
      $9::timestamptz,
      'synced',
      NOW(),
      $10
    )
    `, [
        note.clientId,
        userEmail,
        note.title,
        note.body,
        note.isPinned,
        note.isArchived,
        note.createdAt,
        note.updatedAt,
        note.deletedAt,
        deviceId,
    ]);
}
async function updateNote(client, userEmail, note, deviceId) {
    await client.query(`
    UPDATE notes
    SET
      title = $3,
      body = $4,
      is_pinned = $5,
      is_archived = $6,
      updated_at = $7::timestamptz,
      deleted_at = $8::timestamptz,
      sync_status = 'synced',
      last_synced_at = NOW(),
      last_updated_by_device = $9
    WHERE user_email = $1
      AND client_id = $2
    `, [
        userEmail,
        note.clientId,
        note.title,
        note.body,
        note.isPinned,
        note.isArchived,
        note.updatedAt,
        note.deletedAt,
        deviceId,
    ]);
}
async function fetchServerChangesSince(client, userEmail, lastSyncedAt) {
    let result;
    if (!lastSyncedAt) {
        result = await client.query(`
      SELECT
        client_id,
        user_email,
        title,
        body,
        is_pinned,
        is_archived,
        created_at,
        updated_at,
        deleted_at
      FROM notes
      WHERE user_email = $1
      ORDER BY updated_at ASC
      `, [userEmail]);
    }
    else {
        result = await client.query(`
      SELECT
        client_id,
        user_email,
        title,
        body,
        is_pinned,
        is_archived,
        created_at,
        updated_at,
        deleted_at
      FROM notes
      WHERE user_email = $1
        AND (
          updated_at > $2::timestamptz
          OR (deleted_at IS NOT NULL AND deleted_at > $2::timestamptz)
        )
      ORDER BY updated_at ASC
      `, [userEmail, lastSyncedAt]);
    }
    return result.rows.map(mapRowToSyncChange);
}
