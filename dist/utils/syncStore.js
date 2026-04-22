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
        categoryClientId: row.category_client_id,
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
        colorHex: row.color_hex,
        createdAt: toIso(row.created_at),
        updatedAt: toIso(row.updated_at),
        deletedAt: row.deleted_at ? toIso(row.deleted_at) : null,
    };
}
function mapTag(row) {
    return {
        clientId: row.client_id,
        userEmail: row.user_email,
        name: row.name,
        colorHex: row.color_hex,
        createdAt: toIso(row.created_at),
        updatedAt: toIso(row.updated_at),
        deletedAt: row.deleted_at ? toIso(row.deleted_at) : null,
    };
}
function mapNoteTag(row) {
    return {
        noteClientId: row.note_client_id,
        tagClientId: row.tag_client_id,
        userEmail: row.user_email,
        createdAt: toIso(row.created_at),
        updatedAt: toIso(row.updated_at),
        deletedAt: row.deleted_at ? toIso(row.deleted_at) : null,
    };
}
function mapNoteImage(row) {
    return {
        clientId: row.client_id,
        noteClientId: row.note_client_id,
        userEmail: row.user_email,
        remoteFileKey: row.remote_file_key,
        mimeType: row.mime_type,
        fileName: row.file_name,
        fileSizeBytes: row.file_size_bytes,
        width: row.width,
        height: row.height,
        sortOrder: row.sort_order,
        syncStatus: row.sync_status,
        createdAt: toIso(row.created_at),
        updatedAt: toIso(row.updated_at),
        lastSyncedAt: row.last_synced_at ? toIso(row.last_synced_at) : null,
        deletedAt: row.deleted_at ? toIso(row.deleted_at) : null,
    };
}
function mapDayValidation(row) {
    return {
        clientId: row.client_id,
        userEmail: row.user_email,
        validationDate: row.validation_date,
        isValidated: row.is_validated,
        validatedAt: row.validated_at ? toIso(row.validated_at) : null,
        note: row.note,
        createdAt: toIso(row.created_at),
        updatedAt: toIso(row.updated_at),
        deletedAt: row.deleted_at ? toIso(row.deleted_at) : null,
    };
}
function mapDayValidationTag(row) {
    return {
        dayValidationClientId: row.day_validation_client_id,
        tagClientId: row.tag_client_id,
        userEmail: row.user_email,
        createdAt: toIso(row.created_at),
        updatedAt: toIso(row.updated_at),
        deletedAt: row.deleted_at ? toIso(row.deleted_at) : null,
    };
}
async function applyNoteChanges(client, userEmail, noteChanges) {
    for (const change of noteChanges) {
        const categoryOwnershipCheck = change.categoryClientId === null
            ? true
            : (await client.query(`
              SELECT 1
              FROM categories
              WHERE client_id = $1
                AND user_email = $2
              LIMIT 1
              `, [change.categoryClientId, userEmail])).rowCount === 1;
        if (!categoryOwnershipCheck) {
            continue;
        }
        await client.query(`
      INSERT INTO notes (
        client_id,
        user_email,
        title,
        body,
        category_client_id,
        is_pinned,
        is_archived,
        sync_status,
        created_at,
        updated_at,
        last_synced_at,
        deleted_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        'synced',
        $8, $9, NOW(), $10
      )
      ON CONFLICT (client_id)
      DO UPDATE SET
        title = EXCLUDED.title,
        body = EXCLUDED.body,
        category_client_id = EXCLUDED.category_client_id,
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
            change.categoryClientId,
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
        color_hex,
        created_at,
        updated_at,
        deleted_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (client_id)
      DO UPDATE SET
        name = EXCLUDED.name,
        color_hex = EXCLUDED.color_hex,
        updated_at = EXCLUDED.updated_at,
        deleted_at = EXCLUDED.deleted_at,
        user_email = EXCLUDED.user_email
      WHERE categories.user_email = $2
        AND categories.updated_at <= EXCLUDED.updated_at
      `, [
            change.clientId,
            userEmail,
            change.name,
            change.colorHex,
            change.createdAt,
            change.updatedAt,
            change.deletedAt,
        ]);
    }
}
async function applyTagChanges(client, userEmail, tagChanges) {
    for (const change of tagChanges) {
        await client.query(`
      INSERT INTO tags (
        client_id,
        user_email,
        name,
        color_hex,
        created_at,
        updated_at,
        deleted_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (client_id)
      DO UPDATE SET
        name = EXCLUDED.name,
        color_hex = EXCLUDED.color_hex,
        updated_at = EXCLUDED.updated_at,
        deleted_at = EXCLUDED.deleted_at,
        user_email = EXCLUDED.user_email
      WHERE tags.user_email = $2
        AND tags.updated_at <= EXCLUDED.updated_at
      `, [
            change.clientId,
            userEmail,
            change.name,
            change.colorHex,
            change.createdAt,
            change.updatedAt,
            change.deletedAt,
        ]);
    }
}
async function applyNoteTagChanges(client, userEmail, linkChanges) {
    for (const change of linkChanges) {
        const ownershipCheck = await client.query(`
      SELECT 1
      FROM notes n
      INNER JOIN tags t
        ON t.client_id = $2
      WHERE n.client_id = $1
        AND n.user_email = $3
        AND t.user_email = $3
      LIMIT 1
      `, [change.noteClientId, change.tagClientId, userEmail]);
        if (ownershipCheck.rowCount === 0) {
            continue;
        }
        await client.query(`
      INSERT INTO note_tags (
        note_client_id,
        tag_client_id,
        created_at,
        updated_at,
        deleted_at
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (note_client_id, tag_client_id)
      DO UPDATE SET
        created_at = LEAST(note_tags.created_at, EXCLUDED.created_at),
        updated_at = EXCLUDED.updated_at,
        deleted_at = EXCLUDED.deleted_at
      WHERE note_tags.updated_at <= EXCLUDED.updated_at
      `, [
            change.noteClientId,
            change.tagClientId,
            change.createdAt,
            change.updatedAt,
            change.deletedAt,
        ]);
    }
}
async function applyNoteImageChanges(client, userEmail, imageChanges) {
    for (const change of imageChanges) {
        const noteOwnershipCheck = await client.query(`
      SELECT 1
      FROM notes
      WHERE client_id = $1
        AND user_email = $2
      LIMIT 1
      `, [change.noteClientId, userEmail]);
        if (noteOwnershipCheck.rowCount === 0) {
            continue;
        }
        await client.query(`
      INSERT INTO note_images (
        client_id,
        note_client_id,
        user_email,
        remote_file_key,
        mime_type,
        file_name,
        file_size_bytes,
        width,
        height,
        sort_order,
        created_at,
        updated_at,
        last_synced_at,
        deleted_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, NOW(), $13
      )
      ON CONFLICT (client_id)
      DO UPDATE SET
        note_client_id = EXCLUDED.note_client_id,
        user_email = EXCLUDED.user_email,
        remote_file_key = EXCLUDED.remote_file_key,
        mime_type = EXCLUDED.mime_type,
        file_name = EXCLUDED.file_name,
        file_size_bytes = EXCLUDED.file_size_bytes,
        width = EXCLUDED.width,
        height = EXCLUDED.height,
        sort_order = EXCLUDED.sort_order,
        updated_at = EXCLUDED.updated_at,
        deleted_at = EXCLUDED.deleted_at,
        last_synced_at = NOW()
      WHERE note_images.user_email = $3
        AND note_images.updated_at <= EXCLUDED.updated_at
      `, [
            change.clientId,
            change.noteClientId,
            userEmail,
            change.remoteFileKey,
            change.mimeType,
            change.fileName,
            change.fileSizeBytes,
            change.width,
            change.height,
            change.sortOrder,
            change.createdAt,
            change.updatedAt,
            change.deletedAt,
        ]);
    }
}
async function applyDayValidationChanges(client, userEmail, dayValidationChanges) {
    for (const change of dayValidationChanges) {
        await client.query(`
      INSERT INTO day_validations (
        client_id,
        user_email,
        validation_date,
        is_validated,
        validated_at,
        note,
        created_at,
        updated_at,
        deleted_at
      )
      VALUES (
        $1, $2, $3::date, $4, $5, $6, $7, $8, $9
      )
      ON CONFLICT (client_id)
      DO UPDATE SET
        user_email = EXCLUDED.user_email,
        validation_date = EXCLUDED.validation_date,
        is_validated = EXCLUDED.is_validated,
        validated_at = EXCLUDED.validated_at,
        note = EXCLUDED.note,
        updated_at = EXCLUDED.updated_at,
        deleted_at = EXCLUDED.deleted_at
      WHERE day_validations.user_email = $2
        AND day_validations.updated_at <= EXCLUDED.updated_at
      `, [
            change.clientId,
            userEmail,
            change.validationDate,
            change.isValidated,
            change.validatedAt,
            change.note,
            change.createdAt,
            change.updatedAt,
            change.deletedAt,
        ]);
    }
}
async function applyDayValidationTagChanges(client, userEmail, linkChanges) {
    for (const change of linkChanges) {
        const ownershipCheck = await client.query(`
      SELECT 1
      FROM day_validations dv
      INNER JOIN tags t
        ON t.client_id = $2
      WHERE dv.client_id = $1
        AND dv.user_email = $3
        AND t.user_email = $3
      LIMIT 1
      `, [change.dayValidationClientId, change.tagClientId, userEmail]);
        if (ownershipCheck.rowCount === 0) {
            continue;
        }
        await client.query(`
      INSERT INTO day_validation_tags (
        day_validation_client_id,
        tag_client_id,
        created_at,
        updated_at,
        deleted_at
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (day_validation_client_id, tag_client_id)
      DO UPDATE SET
        created_at = LEAST(day_validation_tags.created_at, EXCLUDED.created_at),
        updated_at = EXCLUDED.updated_at,
        deleted_at = EXCLUDED.deleted_at
      WHERE day_validation_tags.updated_at <= EXCLUDED.updated_at
      `, [
            change.dayValidationClientId,
            change.tagClientId,
            change.createdAt,
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
      category_client_id,
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
      color_hex,
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
async function getServerTags(client, userEmail, lastSyncedAt) {
    const boundary = lastSyncedAt ?? "1970-01-01T00:00:00.000Z";
    const result = await client.query(`
    SELECT
      client_id,
      user_email,
      name,
      color_hex,
      created_at,
      updated_at,
      deleted_at
    FROM tags
    WHERE user_email = $1
      AND GREATEST(
        updated_at,
        COALESCE(deleted_at, to_timestamp(0))
      ) > $2::timestamptz
    ORDER BY updated_at ASC
    `, [userEmail, boundary]);
    return result.rows.map(mapTag);
}
async function getServerNoteTagLinks(client, userEmail, lastSyncedAt) {
    const boundary = lastSyncedAt ?? "1970-01-01T00:00:00.000Z";
    const result = await client.query(`
    SELECT
      nt.note_client_id,
      nt.tag_client_id,
      n.user_email,
      nt.created_at,
      nt.updated_at,
      nt.deleted_at
    FROM note_tags nt
    INNER JOIN notes n
      ON n.client_id = nt.note_client_id
    INNER JOIN tags t
      ON t.client_id = nt.tag_client_id
    WHERE n.user_email = $1
      AND t.user_email = $1
      AND GREATEST(
        nt.updated_at,
        COALESCE(nt.deleted_at, to_timestamp(0))
      ) > $2::timestamptz
    ORDER BY nt.updated_at ASC
    `, [userEmail, boundary]);
    return result.rows.map(mapNoteTag);
}
async function getServerNoteImages(client, userEmail, lastSyncedAt) {
    const boundary = lastSyncedAt ?? "1970-01-01T00:00:00.000Z";
    const result = await client.query(`
    SELECT
      client_id,
      note_client_id,
      user_email,
      remote_file_key,
      mime_type,
      file_name,
      file_size_bytes,
      width,
      height,
      sort_order,
      'synced'::text AS sync_status,
      created_at,
      updated_at,
      last_synced_at,
      deleted_at
    FROM note_images
    WHERE user_email = $1
      AND GREATEST(
        updated_at,
        COALESCE(last_synced_at, to_timestamp(0)),
        COALESCE(deleted_at, to_timestamp(0))
      ) > $2::timestamptz
    ORDER BY updated_at ASC
    `, [userEmail, boundary]);
    return result.rows.map(mapNoteImage);
}
async function getServerDayValidations(client, userEmail, lastSyncedAt) {
    const boundary = lastSyncedAt ?? "1970-01-01T00:00:00.000Z";
    const result = await client.query(`
    SELECT
      client_id,
      user_email,
      validation_date::text AS validation_date,
      is_validated,
      validated_at,
      note,
      created_at,
      updated_at,
      deleted_at
    FROM day_validations
    WHERE user_email = $1
      AND GREATEST(
        updated_at,
        COALESCE(deleted_at, to_timestamp(0))
      ) > $2::timestamptz
    ORDER BY updated_at ASC
    `, [userEmail, boundary]);
    return result.rows.map(mapDayValidation);
}
async function getServerDayValidationTagLinks(client, userEmail, lastSyncedAt) {
    const boundary = lastSyncedAt ?? "1970-01-01T00:00:00.000Z";
    const result = await client.query(`
    SELECT
      dvt.day_validation_client_id,
      dvt.tag_client_id,
      dv.user_email,
      dvt.created_at,
      dvt.updated_at,
      dvt.deleted_at
    FROM day_validation_tags dvt
    INNER JOIN day_validations dv
      ON dv.client_id = dvt.day_validation_client_id
    INNER JOIN tags t
      ON t.client_id = dvt.tag_client_id
    WHERE dv.user_email = $1
      AND t.user_email = $1
      AND GREATEST(
        dvt.updated_at,
        COALESCE(dvt.deleted_at, to_timestamp(0))
      ) > $2::timestamptz
    ORDER BY dvt.updated_at ASC
    `, [userEmail, boundary]);
    return result.rows.map(mapDayValidationTag);
}
async function runSync(payload) {
    const client = await pool_1.pool.connect();
    try {
        await client.query("BEGIN");
        await applyCategoryChanges(client, payload.userEmail, payload.categoryChanges ?? []);
        await applyTagChanges(client, payload.userEmail, payload.tagChanges ?? []);
        await applyNoteChanges(client, payload.userEmail, payload.noteChanges ?? []);
        await applyNoteTagChanges(client, payload.userEmail, payload.noteTagChanges ?? []);
        await applyNoteImageChanges(client, payload.userEmail, payload.noteImageChanges ?? []);
        await applyDayValidationChanges(client, payload.userEmail, payload.dayValidationChanges ?? []);
        await applyDayValidationTagChanges(client, payload.userEmail, payload.dayValidationTagChanges ?? []);
        const [notes, categories, tags, noteTagLinks, noteImages, dayValidations, dayValidationTagLinks,] = await Promise.all([
            getServerNotes(client, payload.userEmail, payload.lastSyncedAt),
            getServerCategories(client, payload.userEmail, payload.lastSyncedAt),
            getServerTags(client, payload.userEmail, payload.lastSyncedAt),
            getServerNoteTagLinks(client, payload.userEmail, payload.lastSyncedAt),
            getServerNoteImages(client, payload.userEmail, payload.lastSyncedAt),
            getServerDayValidations(client, payload.userEmail, payload.lastSyncedAt),
            getServerDayValidationTagLinks(client, payload.userEmail, payload.lastSyncedAt),
        ]);
        await client.query("COMMIT");
        return {
            notes,
            categories,
            tags,
            noteTagLinks,
            noteImages,
            dayValidations,
            dayValidationTagLinks,
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
