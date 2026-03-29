import { pool } from "../db/pool";
import {
  fetchServerChangesSince,
  findNoteByClientId,
  insertNote,
  updateNote
} from "../db/notes";
import {
  SyncNoteChange,
  SyncRequestBody,
  SyncResponseBody
} from "../types/sync";
import { isValidIsoDate } from "../utils/time";

function validateNote(note: SyncNoteChange): void {
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

  if (!isValidIsoDate(note.createdAt)) {
    throw new Error(`Invalid createdAt for ${note.clientId}`);
  }

  if (!isValidIsoDate(note.updatedAt)) {
    throw new Error(`Invalid updatedAt for ${note.clientId}`);
  }

  if (note.deletedAt !== null && !isValidIsoDate(note.deletedAt)) {
    throw new Error(`Invalid deletedAt for ${note.clientId}`);
  }
}

export async function runSync(
  input: SyncRequestBody
): Promise<SyncResponseBody> {
  if (input.lastSyncedAt !== null && input.lastSyncedAt !== undefined) {
    if (!isValidIsoDate(input.lastSyncedAt)) {
      throw new Error("Invalid lastSyncedAt");
    }
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const incoming of input.changes) {
      validateNote(incoming);

      const existing = await findNoteByClientId(client, incoming.clientId);

      if (!existing) {
        await insertNote(client, incoming, input.deviceId ?? null);
        continue;
      }

      const serverUpdatedAt = new Date(existing.updated_at).getTime();
      const incomingUpdatedAt = new Date(incoming.updatedAt).getTime();

      // last write wins
      if (incomingUpdatedAt > serverUpdatedAt) {
        await updateNote(client, incoming, input.deviceId ?? null);
      }
    }

    const serverChanges = await fetchServerChangesSince(
      client,
      input.lastSyncedAt ?? null
    );

    const serverTimeResult = await client.query<{ now: Date }>(
      `SELECT NOW() AS now`
    );

    await client.query("COMMIT");

    return {
      serverTime: serverTimeResult.rows[0].now.toISOString(),
      changes: serverChanges
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}