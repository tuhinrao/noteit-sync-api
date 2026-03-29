import { PoolClient } from "pg";
import { pool } from "../db/pool";
import {
  CategoryChange,
  NoteCategoryChange,
  SyncCategory,
  SyncNote,
  SyncNoteCategory,
  SyncRequest,
  SyncResponse,
} from "../types/sync";

type NoteRow = {
  client_id: string;
  user_email: string;
  title: string;
  body: string;
  is_pinned: boolean;
  is_archived: boolean;
  sync_status: SyncNote["syncStatus"];
  created_at: Date | string;
  updated_at: Date | string;
  last_synced_at: Date | string | null;
  deleted_at: Date | string | null;
};

type CategoryRow = {
  client_id: string;
  user_email: string;
  name: string;
  created_at: Date | string;
  updated_at: Date | string;
  deleted_at: Date | string | null;
};

type NoteCategoryRow = {
  note_client_id: string;
  category_client_id: string;
  user_email: string;
  created_at: Date | string;
  updated_at: Date | string;
  deleted_at: Date | string | null;
};

function toIso(value: Date | string): string {
  return new Date(value).toISOString();
}

function mapNote(row: NoteRow): SyncNote {
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

function mapCategory(row: CategoryRow): SyncCategory {
  return {
    clientId: row.client_id,
    userEmail: row.user_email,
    name: row.name,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    deletedAt: row.deleted_at ? toIso(row.deleted_at) : null,
  };
}

function mapNoteCategory(row: NoteCategoryRow): SyncNoteCategory {
  return {
    noteClientId: row.note_client_id,
    categoryClientId: row.category_client_id,
    userEmail: row.user_email,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    deletedAt: row.deleted_at ? toIso(row.deleted_at) : null,
  };
}

async function applyNoteChanges(
  client: PoolClient,
  userEmail: string,
  noteChanges: SyncRequest["noteChanges"]
): Promise<void> {
  for (const change of noteChanges) {
    await client.query(
      `
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
      `,
      [
        change.clientId,
        userEmail,
        change.title,
        change.body,
        change.isPinned,
        change.isArchived,
        change.createdAt,
        change.updatedAt,
        change.deletedAt,
      ]
    );
  }
}

async function applyCategoryChanges(
  client: PoolClient,
  userEmail: string,
  categoryChanges: CategoryChange[]
): Promise<void> {
  for (const change of categoryChanges) {
    await client.query(
      `
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
      `,
      [
        change.clientId,
        userEmail,
        change.name,
        change.createdAt,
        change.updatedAt,
        change.deletedAt,
      ]
    );
  }
}

async function applyNoteCategoryChanges(
  client: PoolClient,
  userEmail: string,
  linkChanges: NoteCategoryChange[]
): Promise<void> {
  for (const change of linkChanges) {
    const ownershipCheck = await client.query(
      `
      SELECT 1
      FROM notes n
      INNER JOIN categories c
        ON c.client_id = $2
      WHERE n.client_id = $1
        AND n.user_email = $3
        AND c.user_email = $3
      LIMIT 1
      `,
      [change.noteClientId, change.categoryClientId, userEmail]
    );

    if (ownershipCheck.rowCount === 0) {
      continue;
    }

    await client.query(
      `
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
      `,
      [
        change.noteClientId,
        change.categoryClientId,
        change.updatedAt,
        change.deletedAt,
      ]
    );
  }
}

async function getServerNotes(
  client: PoolClient,
  userEmail: string,
  lastSyncedAt: string | null
): Promise<SyncNote[]> {
  const boundary = lastSyncedAt ?? "1970-01-01T00:00:00.000Z";

  const result = await client.query<NoteRow>(
    `
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
    `,
    [userEmail, boundary]
  );

  return result.rows.map(mapNote);
}

async function getServerCategories(
  client: PoolClient,
  userEmail: string,
  lastSyncedAt: string | null
): Promise<SyncCategory[]> {
  const boundary = lastSyncedAt ?? "1970-01-01T00:00:00.000Z";

  const result = await client.query<CategoryRow>(
    `
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
    `,
    [userEmail, boundary]
  );

  return result.rows.map(mapCategory);
}

async function getServerNoteCategoryLinks(
  client: PoolClient,
  userEmail: string,
  lastSyncedAt: string | null
): Promise<SyncNoteCategory[]> {
  const boundary = lastSyncedAt ?? "1970-01-01T00:00:00.000Z";

  const result = await client.query<NoteCategoryRow>(
    `
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
    `,
    [userEmail, boundary]
  );

  return result.rows.map(mapNoteCategory);
}

export async function runSync(payload: SyncRequest): Promise<SyncResponse> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await applyNoteChanges(client, payload.userEmail, payload.noteChanges ?? []);
    await applyCategoryChanges(client, payload.userEmail, payload.categoryChanges ?? []);
    await applyNoteCategoryChanges(
      client,
      payload.userEmail,
      payload.noteCategoryChanges ?? []
    );

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
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}