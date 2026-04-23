export type CashEntryChange = {
  clientId: string;
  entryDate: string;
  details: string;
  credit: number;
  debit: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
};

export type CashSyncRequest = {
  userEmail: string;
  lastSyncedAt: string | null;
  cashEntryChanges: CashEntryChange[];
  deviceId?: string | null;
};

export type SyncCashEntry = {
  clientId: string;
  userEmail: string;
  entryDate: string;
  details: string;
  credit: number;
  debit: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
};

export type CashSyncResponse = {
  cashEntries: SyncCashEntry[];
  serverTime: string;
};