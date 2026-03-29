export interface SyncNoteChange {
  clientId: string;
  title: string;
  body: string;
  isPinned: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface SyncRequestBody {
  lastSyncedAt: string | null;
  changes: SyncNoteChange[];
  deviceId?: string | null;
}

export interface SyncResponseBody {
  serverTime: string;
  changes: SyncNoteChange[];
}