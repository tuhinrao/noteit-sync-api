import { PoolClient } from "pg";
import { pool } from "../db/pool";
import {
  DayValidationChange,
  DayValidationSyncRequest,
  DayValidationSyncResponse,
  DayValidationTagChange,
  SyncDayValidation,
  SyncDayValidationTag,
  SyncTrackedValidationTag,
  TrackedValidationTagChange,
} from "../types/dayValidationSync";
import { SyncTag, TagChange } from "../types/noteSync";

type TagRow = {
  client_id: string;
  user_email: string;
  name: string;
  color_hex: string;
  created_at: Date | string;
  updated_at: Date | string;
  deleted_at: Date | string | null;
};

type DayValidationRow = {
  client_id: string;
  user_email: string;
  validation_date: string;
  is_validated: boolean;
  validated_at: Date | string | null;
  note: string;
  created_at: Date | string;
  updated_at: Date | string;
  deleted_at: Date | string | null;
};

type DayValidationTagRow = {
  day_validation_client_id: string;
  tag_client_id: string;
  user_email: string;
  created_at: Date | string;
  updated_at: Date | string;
  deleted_at: Date | string | null;
};

type TrackedValidationTagRow = {
  tag_client_id: string;
  user_email: string;
  created_at: Date | string;
  updated_at: Date | string;
  deleted_at: Date | string | null;
};

function toIso(value: Date | string): string {
  return new Date(value).toISOString();
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

function mapDayValidation(row: DayValidationRow): SyncDayValidation {
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

function mapDayValidationTag(row: DayValidationTagRow): SyncDayValidationTag {
  return {
    dayValidationClientId: row.day_validation_client_id,
    tagClientId: row.tag_client_id,
    userEmail: row.user_email,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    deletedAt: row.deleted_at ? toIso(row.deleted_at) : null,
  };
}

function mapTrackedValidationTag(
  row: TrackedValidationTagRow
): SyncTrackedValidationTag {
  return {
    tagClientId: row.tag_client_id,
    userEmail: row.user_email,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    deletedAt: row.deleted_at ? toIso(row.deleted_at) : null,
  };
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

async function applyDayValidationChanges(
  client: PoolClient,
  userEmail: string,
  dayValidationChanges: DayValidationChange[]
): Promise<void> {
  for (const change of dayValidationChanges) {
    await client.query(
      `
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
      `,
      [
        change.clientId,
        userEmail,
        change.validationDate,
        change.isValidated,
        change.validatedAt,
        change.note,
        change.createdAt,
        change.updatedAt,
        change.deletedAt,
      ]
    );
  }
}

async function applyDayValidationTagChanges(
  client: PoolClient,
  userEmail: string,
  linkChanges: DayValidationTagChange[]
): Promise<void> {
  for (const change of linkChanges) {
    const ownershipCheck = await client.query(
      `
      SELECT 1
      FROM day_validations dv
      INNER JOIN tags t
        ON t.client_id = $2
      WHERE dv.client_id = $1
        AND dv.user_email = $3
        AND t.user_email = $3
      LIMIT 1
      `,
      [change.dayValidationClientId, change.tagClientId, userEmail]
    );

    if (ownershipCheck.rowCount === 0) {
      continue;
    }

    await client.query(
      `
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
      `,
      [
        change.dayValidationClientId,
        change.tagClientId,
        change.createdAt,
        change.updatedAt,
        change.deletedAt,
      ]
    );
  }
}

async function applyTrackedValidationTagChanges(
  client: PoolClient,
  userEmail: string,
  trackedValidationTagChanges: TrackedValidationTagChange[]
): Promise<void> {
  for (const change of trackedValidationTagChanges) {
    const tagOwnershipCheck = await client.query(
      `
      SELECT 1
      FROM tags
      WHERE client_id = $1
        AND user_email = $2
      LIMIT 1
      `,
      [change.tagClientId, userEmail]
    );

    if (tagOwnershipCheck.rowCount === 0) {
      continue;
    }

    await client.query(
      `
      INSERT INTO tracked_validation_tags (
        tag_client_id,
        created_at,
        updated_at,
        deleted_at,
        sync_status
      )
      VALUES ($1, $2, $3, $4, 'synced')
      ON CONFLICT (tag_client_id)
      DO UPDATE SET
        updated_at = EXCLUDED.updated_at,
        deleted_at = EXCLUDED.deleted_at,
        sync_status = 'synced'
      WHERE tracked_validation_tags.updated_at <= EXCLUDED.updated_at
      `,
      [
        change.tagClientId,
        change.createdAt,
        change.updatedAt,
        change.deletedAt,
      ]
    );
  }
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

async function getServerDayValidations(
  client: PoolClient,
  userEmail: string,
  lastSyncedAt: string | null
): Promise<SyncDayValidation[]> {
  const boundary = lastSyncedAt ?? "1970-01-01T00:00:00.000Z";

  const result = await client.query<DayValidationRow>(
    `
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
    `,
    [userEmail, boundary]
  );

  return result.rows.map(mapDayValidation);
}

async function getServerDayValidationTagLinks(
  client: PoolClient,
  userEmail: string,
  lastSyncedAt: string | null
): Promise<SyncDayValidationTag[]> {
  const boundary = lastSyncedAt ?? "1970-01-01T00:00:00.000Z";

  const result = await client.query<DayValidationTagRow>(
    `
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
    `,
    [userEmail, boundary]
  );

  return result.rows.map(mapDayValidationTag);
}

async function getServerTrackedValidationTags(
  client: PoolClient,
  userEmail: string,
  lastSyncedAt: string | null
): Promise<SyncTrackedValidationTag[]> {
  const boundary = lastSyncedAt ?? "1970-01-01T00:00:00.000Z";

  const result = await client.query<TrackedValidationTagRow>(
    `
    SELECT
      tvt.tag_client_id,
      t.user_email,
      tvt.created_at,
      tvt.updated_at,
      tvt.deleted_at
    FROM tracked_validation_tags tvt
    INNER JOIN tags t
      ON t.client_id = tvt.tag_client_id
    WHERE t.user_email = $1
      AND GREATEST(
        tvt.updated_at,
        COALESCE(tvt.deleted_at, to_timestamp(0))
      ) > $2::timestamptz
    ORDER BY tvt.updated_at ASC
    `,
    [userEmail, boundary]
  );

  return result.rows.map(mapTrackedValidationTag);
}

export async function runDayValidationSync(
  payload: DayValidationSyncRequest
): Promise<DayValidationSyncResponse> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await applyTagChanges(client, payload.userEmail, payload.tagChanges ?? []);
    await applyDayValidationChanges(
      client,
      payload.userEmail,
      payload.dayValidationChanges ?? []
    );
    await applyDayValidationTagChanges(
      client,
      payload.userEmail,
      payload.dayValidationTagChanges ?? []
    );
    await applyTrackedValidationTagChanges(
      client,
      payload.userEmail,
      payload.trackedValidationTagChanges ?? []
    );

    const [
      tags,
      dayValidations,
      dayValidationTagLinks,
      trackedValidationTags,
    ] = await Promise.all([
      getServerTags(client, payload.userEmail, payload.lastSyncedAt),
      getServerDayValidations(client, payload.userEmail, payload.lastSyncedAt),
      getServerDayValidationTagLinks(
        client,
        payload.userEmail,
        payload.lastSyncedAt
      ),
      getServerTrackedValidationTags(
        client,
        payload.userEmail,
        payload.lastSyncedAt
      ),
    ]);

    await client.query("COMMIT");

    return {
      tags,
      dayValidations,
      dayValidationTagLinks,
      trackedValidationTags,
      serverTime: new Date().toISOString(),
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}