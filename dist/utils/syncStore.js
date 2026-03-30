"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSync = runSync;
const pool_1 = require("../db/pool");
function toIso(value) {
    return new Date(value).toISOString();
}
function mapNote(row) {
    return {
        clientId: row.client_id,
        userEmail: row.user_email,
        title: row.title,
        body: row.body,
        isPinned: row.is_pinned,
        isArchived: row.is_archived,
        syncStatus: row.sync_status,
        createdAt: toIso(row.created_at),
        updatedAt: toIso(row.updated_at),
        lastSyncedAt: row.last_synced_at ? toIso(row.last_synced_at) : null,
        deletedAt: row.deleted_at ? toIso(row.deleted_at) : null,
    };
}
function mapCategory(row) {
    return {
        clientId: row.client_id,
        userEmail: row.user_email,
        name: row.name,
        createdAt: toIso(row.created_at),
        updatedAt: toIso(row.updated_at),
        deletedAt: row.deleted_at ? toIso(row.deleted_at) : null,
    };
}
function mapNoteCategory(row) {
    return {
        noteClientId: row.note_client_id,
        categoryClientId: row.category_client_id,
        userEmail: row.user_email,
        createdAt: toIso(row.created_at),
        updatedAt: toIso(row.updated_at),
        deletedAt: row.deleted_at ? toIso(row.deleted_at) : null,
    };
}
async function applyNoteChanges(client, userEmail, noteChanges) {
    for (const change of noteChanges) {
        await client.query(`
      INSERT INTO notes (
        client_id,
        user_email,
        title,
        body,
        is_pinned,
        is_archived,
        sync_status,
        created_at,
        updated_at,
        last_synced_at,
        deleted_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6,
        'synced',
        $7, $8, NOW(), $9
      )
      ON CONFLICT (client_id)
      DO UPDATE SET
        title = EXCLUDED.title,
        body = EXCLUDED.body,
        is_pinned = EXCLUDED.is_pinned,
        is_archived = EXCLUDED.is_archived,
        updated_at = EXCLUDED.updated_at,
        deleted_at = EXCLUDED.deleted_at,
        user_email = EXCLUDED.user_email,
        sync_status = 'synced',
        last_synced_at = NOW()
      WHERE notes.user_email = $2
        AND notes.updated_at <= EXCLUDED.updated_at
      `, [
            change.clientId,
            userEmail,
            change.title,
            change.body,
            change.isPinned,
            change.isArchived,
            change.createdAt,
            change.updatedAt,
            change.deletedAt,
        ]);
    }
}
async function applyCategoryChanges(client, userEmail, categoryChanges) {
    for (const change of categoryChanges) {
        await client.query(`
      INSERT INTO categories (
        client_id,
        user_email,
        name,
        created_at,
        updated_at,
        deleted_at
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (client_id)
      DO UPDATE SET
        name = EXCLUDED.name,
        updated_at = EXCLUDED.updated_at,
        deleted_at = EXCLUDED.deleted_at,
        user_email = EXCLUDED.user_email
      WHERE categories.user_email = $2
        AND categories.updated_at <= EXCLUDED.updated_at
      `, [
            change.clientId,
            userEmail,
            change.name,
            change.createdAt,
            change.updatedAt,
            change.deletedAt,
        ]);
    }
}
async function applyNoteCategoryChanges(client, userEmail, linkChanges) {
    for (const change of linkChanges) {
        const ownershipCheck = await client.query(`
      SELECT 1
      FROM notes n
      INNER JOIN categories c
        ON c.client_id = $2
      WHERE n.client_id = $1
        AND n.user_email = $3
        AND c.user_email = $3
      LIMIT 1
      `, [change.noteClientId, change.categoryClientId, userEmail]);
        if (ownershipCheck.rowCount === 0) {
            continue;
        }
        await client.query(`
      INSERT INTO note_categories (
        note_client_id,
        category_client_id,
        created_at,
        updated_at,
        deleted_at
      )
      VALUES ($1, $2, NOW(), $3, $4)
      ON CONFLICT (note_client_id, category_client_id)
      DO UPDATE SET
        updated_at = EXCLUDED.updated_at,
        deleted_at = EXCLUDED.deleted_at
      WHERE note_categories.updated_at <= EXCLUDED.updated_at
      `, [
            change.noteClientId,
            change.categoryClientId,
            change.updatedAt,
            change.deletedAt,
        ]);
    }
}
async function getServerNotes(client, userEmail, lastSyncedAt) {
    const boundary = lastSyncedAt ?? "1970-01-01T00:00:00.000Z";
    const result = await client.query(`
    SELECT
      client_id,
      user_email,
      title,
      body,
      is_pinned,
      is_archived,
      sync_status,
      created_at,
      updated_at,
      last_synced_at,
      deleted_at
    FROM notes
    WHERE user_email = $1
      AND GREATEST(
        updated_at,
        COALESCE(last_synced_at, to_timestamp(0)),
        COALESCE(deleted_at, to_timestamp(0))
      ) > $2::timestamptz
    ORDER BY updated_at ASC
    `, [userEmail, boundary]);
    return result.rows.map(mapNote);
}
async function getServerCategories(client, userEmail, lastSyncedAt) {
    const boundary = lastSyncedAt ?? "1970-01-01T00:00:00.000Z";
    const result = await client.query(`
    SELECT
      client_id,
      user_email,
      name,
      created_at,
      updated_at,
      deleted_at
    FROM categories
    WHERE user_email = $1
      AND GREATEST(
        updated_at,
        COALESCE(deleted_at, to_timestamp(0))
      ) > $2::timestamptz
    ORDER BY updated_at ASC
    `, [userEmail, boundary]);
    return result.rows.map(mapCategory);
}
async function getServerNoteCategoryLinks(client, userEmail, lastSyncedAt) {
    const boundary = lastSyncedAt ?? "1970-01-01T00:00:00.000Z";
    const result = await client.query(`
    SELECT
      nc.note_client_id,
      nc.category_client_id,
      n.user_email,
      nc.created_at,
      nc.updated_at,
      nc.deleted_at
    FROM note_categories nc
    INNER JOIN notes n
      ON n.client_id = nc.note_client_id
    INNER JOIN categories c
      ON c.client_id = nc.category_client_id
    WHERE n.user_email = $1
      AND c.user_email = $1
      AND GREATEST(
        nc.updated_at,
        COALESCE(nc.deleted_at, to_timestamp(0))
      ) > $2::timestamptz
    ORDER BY nc.updated_at ASC
    `, [userEmail, boundary]);
    return result.rows.map(mapNoteCategory);
}
async function runSync(payload) {
    const client = await pool_1.pool.connect();
    try {
        await client.query("BEGIN");
        await applyNoteChanges(client, payload.userEmail, payload.noteChanges ?? []);
        await applyCategoryChanges(client, payload.userEmail, payload.categoryChanges ?? []);
        await applyNoteCategoryChanges(client, payload.userEmail, payload.noteCategoryChanges ?? []);
        const [notes, categories, noteCategoryLinks] = await Promise.all([
            getServerNotes(client, payload.userEmail, payload.lastSyncedAt),
            getServerCategories(client, payload.userEmail, payload.lastSyncedAt),
            getServerNoteCategoryLinks(client, payload.userEmail, payload.lastSyncedAt),
        ]);
        await client.query("COMMIT");
        return {
            notes,
            categories,
            noteCategoryLinks,
            serverTime: new Date().toISOString(),
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
