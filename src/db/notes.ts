import { PoolClient } from "pg";
import { SyncNoteChange } from "../types/sync";
import { toIsoString } from "../utils/time";

interface DbNoteRow {
  client_id: string;
  title: string;
  body: string;
  is_pinned: boolean;
  is_archived: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export function mapRowToSyncChange(row: DbNoteRow): SyncNoteChange {
  return {
    clientId: row.client_id,
    title: row.title,
    body: row.body,
    isPinned: row.is_pinned,
    isArchived: row.is_archived,
    createdAt: toIsoString(row.created_at)!,
    updatedAt: toIsoString(row.updated_at)!,
    deletedAt: toIsoString(row.deleted_at)
  };
}

export async function findNoteByClientId(
  client: PoolClient,
  clientId: string
): Promise<DbNoteRow | null> {
  const result = await client.query<DbNoteRow>(
    `
    SELECT
      client_id,
      title,
      body,
      is_pinned,
      is_archived,
      created_at,
      updated_at,
      deleted_at
    FROM notes
    WHERE client_id = $1
    LIMIT 1
    `,
    [clientId]
  );

  return result.rows[0] ?? null;
}

export async function insertNote(
  client: PoolClient,
  note: SyncNoteChange,
  deviceId: string | null
): Promise<void> {
  await client.query(
    `
    INSERT INTO notes (
      client_id,
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
    VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $7::timestamptz, $8::timestamptz, 'synced', NOW(), $9)
    `,
    [
      note.clientId,
      note.title,
      note.body,
      note.isPinned,
      note.isArchived,
      note.createdAt,
      note.updatedAt,
      note.deletedAt,
      deviceId
    ]
  );
}

export async function updateNote(
  client: PoolClient,
  note: SyncNoteChange,
  deviceId: string | null
): Promise<void> {
  await client.query(
    `
    UPDATE notes
    SET
      title = $2,
      body = $3,
      is_pinned = $4,
      is_archived = $5,
      updated_at = $6::timestamptz,
      deleted_at = $7::timestamptz,
      sync_status = 'synced',
      last_synced_at = NOW(),
      last_updated_by_device = $8
    WHERE client_id = $1
    `,
    [
      note.clientId,
      note.title,
      note.body,
      note.isPinned,
      note.isArchived,
      note.updatedAt,
      note.deletedAt,
      deviceId
    ]
  );
}

export async function fetchServerChangesSince(
  client: PoolClient,
  lastSyncedAt: string | null
): Promise<SyncNoteChange[]> {
  let result;

  if (!lastSyncedAt) {
    result = await client.query<DbNoteRow>(
      `
      SELECT
        client_id,
        title,
        body,
        is_pinned,
        is_archived,
        created_at,
        updated_at,
        deleted_at
      FROM notes
      ORDER BY updated_at ASC
      `
    );
  } else {
    result = await client.query<DbNoteRow>(
      `
      SELECT
        client_id,
        title,
        body,
        is_pinned,
        is_archived,
        created_at,
        updated_at,
        deleted_at
      FROM notes
      WHERE updated_at > $1::timestamptz
         OR (deleted_at IS NOT NULL AND deleted_at > $1::timestamptz)
      ORDER BY updated_at ASC
      `,
      [lastSyncedAt]
    );
  }

  return result.rows.map(mapRowToSyncChange);
}