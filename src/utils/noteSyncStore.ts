import { PoolClient } from "pg";
import { pool } from "../db/pool";
import {
  CategoryChange,
  NoteChange,
  NoteImageChange,
  NoteSyncRequest,
  NoteSyncResponse,
  NoteTagChange,
  SyncCategory,
  SyncNote,
  SyncNoteImage,
  SyncNoteTag,
  SyncTag,
  TagChange,
} from "../types/noteSync";

type NoteRow = {
  client_id: string;
  user_email: string;
  title: string;
  body: string;
  category_client_id: string | null;
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
  color_hex: string;
  created_at: Date | string;
  updated_at: Date | string;
  deleted_at: Date | string | null;
};

type TagRow = {
  client_id: string;
  user_email: string;
  name: string;
  color_hex: string;
  created_at: Date | string;
  updated_at: Date | string;
  deleted_at: Date | string | null;
};

type NoteTagRow = {
  note_client_id: string;
  tag_client_id: string;
  user_email: string;
  created_at: Date | string;
  updated_at: Date | string;
  deleted_at: Date | string | null;
};

type NoteImageRow = {
  client_id: string;
  note_client_id: string;
  user_email: string;
  remote_file_key: string | null;
  mime_type: string;
  file_name: string;
  file_size_bytes: number;
  width: number | null;
  height: number | null;
  sort_order: number;
  sync_status: SyncNoteImage["syncStatus"];
  created_at: Date | string;
  updated_at: Date | string;
  last_synced_at: Date | string | null;
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

function mapCategory(row: CategoryRow): SyncCategory {
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

function mapTag(row: TagRow): SyncTag {
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

function mapNoteTag(row: NoteTagRow): SyncNoteTag {
  return {
    noteClientId: row.note_client_id,
    tagClientId: row.tag_client_id,
    userEmail: row.user_email,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    deletedAt: row.deleted_at ? toIso(row.deleted_at) : null,
  };
}

function mapNoteImage(row: NoteImageRow): SyncNoteImage {
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

async function applyNoteChanges(
  client: PoolClient,
  userEmail: string,
  noteChanges: NoteChange[]
): Promise<void> {
  for (const change of noteChanges) {
    const categoryOwnershipCheck =
      change.categoryClientId === null
        ? true
        : (
            await client.query(
              `
              SELECT 1
              FROM categories
              WHERE client_id = $1
                AND user_email = $2
              LIMIT 1
              `,
              [change.categoryClientId, userEmail]
            )
          ).rowCount === 1;

    if (!categoryOwnershipCheck) {
      continue;
    }

    await client.query(
      `
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
      `,
      [
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
      `,
      [
        change.clientId,
        userEmail,
        change.name,
        change.colorHex,
        change.createdAt,
        change.updatedAt,
        change.deletedAt,
      ]
    );
  }
}

async function applyTagChanges(
  client: PoolClient,
  userEmail: string,
  tagChanges: TagChange[]
): Promise<void> {
  for (const change of tagChanges) {
    await client.query(
      `
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
      `,
      [
        change.clientId,
        userEmail,
        change.name,
        change.colorHex,
        change.createdAt,
        change.updatedAt,
        change.deletedAt,
      ]
    );
  }
}

async function applyNoteTagChanges(
  client: PoolClient,
  userEmail: string,
  linkChanges: NoteTagChange[]
): Promise<void> {
  for (const change of linkChanges) {
    const ownershipCheck = await client.query(
      `
      SELECT 1
      FROM notes n
      INNER JOIN tags t
        ON t.client_id = $2
      WHERE n.client_id = $1
        AND n.user_email = $3
        AND t.user_email = $3
      LIMIT 1
      `,
      [change.noteClientId, change.tagClientId, userEmail]
    );

    if (ownershipCheck.rowCount === 0) {
      continue;
    }

    await client.query(
      `
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
      `,
      [
        change.noteClientId,
        change.tagClientId,
        change.createdAt,
        change.updatedAt,
        change.deletedAt,
      ]
    );
  }
}

async function applyNoteImageChanges(
  client: PoolClient,
  userEmail: string,
  imageChanges: NoteImageChange[]
): Promise<void> {
  for (const change of imageChanges) {
    const noteOwnershipCheck = await client.query(
      `
      SELECT 1
      FROM notes
      WHERE client_id = $1
        AND user_email = $2
      LIMIT 1
      `,
      [change.noteClientId, userEmail]
    );

    if (noteOwnershipCheck.rowCount === 0) {
      continue;
    }

    await client.query(
      `
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
      `,
      [
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
    `,
    [userEmail, boundary]
  );

  return result.rows.map(mapCategory);
}

async function getServerTags(
  client: PoolClient,
  userEmail: string,
  lastSyncedAt: string | null
): Promise<SyncTag[]> {
  const boundary = lastSyncedAt ?? "1970-01-01T00:00:00.000Z";

  const result = await client.query<TagRow>(
    `
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
    `,
    [userEmail, boundary]
  );

  return result.rows.map(mapTag);
}

async function getServerNoteTagLinks(
  client: PoolClient,
  userEmail: string,
  lastSyncedAt: string | null
): Promise<SyncNoteTag[]> {
  const boundary = lastSyncedAt ?? "1970-01-01T00:00:00.000Z";

  const result = await client.query<NoteTagRow>(
    `
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
    `,
    [userEmail, boundary]
  );

  return result.rows.map(mapNoteTag);
}

async function getServerNoteImages(
  client: PoolClient,
  userEmail: string,
  lastSyncedAt: string | null
): Promise<SyncNoteImage[]> {
  const boundary = lastSyncedAt ?? "1970-01-01T00:00:00.000Z";

  const result = await client.query<NoteImageRow>(
    `
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
    `,
    [userEmail, boundary]
  );

  return result.rows.map(mapNoteImage);
}

export async function runNoteSync(
  payload: NoteSyncRequest
): Promise<NoteSyncResponse> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await applyCategoryChanges(client, payload.userEmail, payload.categoryChanges ?? []);
    await applyTagChanges(client, payload.userEmail, payload.tagChanges ?? []);
    await applyNoteChanges(client, payload.userEmail, payload.noteChanges ?? []);
    await applyNoteTagChanges(client, payload.userEmail, payload.noteTagChanges ?? []);
    await applyNoteImageChanges(client, payload.userEmail, payload.noteImageChanges ?? []);

    const [notes, categories, tags, noteTagLinks, noteImages] = await Promise.all([
      getServerNotes(client, payload.userEmail, payload.lastSyncedAt),
      getServerCategories(client, payload.userEmail, payload.lastSyncedAt),
      getServerTags(client, payload.userEmail, payload.lastSyncedAt),
      getServerNoteTagLinks(client, payload.userEmail, payload.lastSyncedAt),
      getServerNoteImages(client, payload.userEmail, payload.lastSyncedAt),
    ]);

    await client.query("COMMIT");

    return {
      notes,
      categories,
      tags,
      noteTagLinks,
      noteImages,
      serverTime: new Date().toISOString(),
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}