import { PoolClient } from "pg";
import { pool } from "../db/pool";
import {
  CashEntryChange,
  CashSyncRequest,
  CashSyncResponse,
  SyncCashEntry,
} from "../types/cash";

type CashEntryRow = {
  client_id: string;
  user_email: string;
  entry_date: Date | string;
  details: string;
  credit: string | number;
  debit: string | number;
  currency: string;
  created_at: Date | string;
  updated_at: Date | string;
};

function toIso(value: Date | string): string {
  return new Date(value).toISOString();
}

function mapCashEntry(row: CashEntryRow): SyncCashEntry {
  return {
    clientId: row.client_id,
    userEmail: row.user_email,
    entryDate: new Date(row.entry_date).toISOString().slice(0, 10),
    details: row.details,
    credit: Number(row.credit),
    debit: Number(row.debit),
    currency: row.currency,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

async function applyCashEntryChanges(
  client: PoolClient,
  userEmail: string,
  changes: CashEntryChange[]
): Promise<void> {
  for (const change of changes) {
    await client.query(
      `
      insert into cash_entries (
        client_id,
        user_email,
        entry_date,
        details,
        credit,
        debit,
        currency,
        created_at,
        updated_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      on conflict (client_id)
      do update set
        entry_date = excluded.entry_date,
        details = excluded.details,
        credit = excluded.credit,
        debit = excluded.debit,
        currency = excluded.currency,
        user_email = excluded.user_email,
        updated_at = NOW()
      where cash_entries.user_email = $2
      `,
      [
        change.clientId,
        userEmail,
        change.entryDate,
        change.details,
        change.credit,
        change.debit,
        change.currency,
        change.createdAt
      ]
    );
  }
}

async function getServerCashEntries(
  client: PoolClient,
  userEmail: string,
  lastSyncedAt: string | null
): Promise<SyncCashEntry[]> {
  const boundary = lastSyncedAt ?? "1970-01-01T00:00:00.000Z";

  const result = await client.query<CashEntryRow>(
    `
    select
      client_id,
      user_email,
      entry_date,
      details,
      credit,
      debit,
      currency,
      created_at,
      updated_at
    from cash_entries
    where user_email = $1
      and updated_at > $2::timestamptz
    order by entry_date asc, created_at asc
    `,
    [userEmail, boundary]
  );

  return result.rows.map(mapCashEntry);
}

export async function runCashSync(
  payload: CashSyncRequest
): Promise<CashSyncResponse> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await applyCashEntryChanges(
      client,
      payload.userEmail,
      payload.cashEntryChanges ?? []
    );

    const cashEntries = await getServerCashEntries(
      client,
      payload.userEmail,
      payload.lastSyncedAt
    );

    await client.query("COMMIT");

    return {
      cashEntries,
      serverTime: new Date().toISOString(),
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}   