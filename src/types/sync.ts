export type SyncStatus =
  | "synced"
  | "pending_create"
  | "pending_update"
  | "pending_delete"
  | "sync_error";

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

export interface SyncCategoryChange {
  clientId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface SyncNoteCategoryChange {
  noteClientId: string;
  categoryClientId: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface SyncRequestBody {
  userEmail: string;
  lastSyncedAt: string | null;
  noteChanges: SyncNoteChange[];
  categoryChanges: SyncCategoryChange[];
  noteCategoryChanges: SyncNoteCategoryChange[];
  deviceId?: string | null;
}

export interface SyncNote {
  clientId: string;
  userEmail: string;
  title: string;
  body: string;
  isPinned: boolean;
  isArchived: boolean;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
  lastSyncedAt: string | null;
  deletedAt: string | null;
}

export interface SyncCategory {
  clientId: string;
  userEmail: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface SyncNoteCategory {
  noteClientId: string;
  categoryClientId: string;
  userEmail: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface SyncResponseBody {
  serverTime: string;
  noteChanges: SyncNoteChange[];
  categoryChanges: SyncCategoryChange[];
  noteCategoryChanges: SyncNoteCategoryChange[];
}

export interface SyncResponse {
  notes: SyncNote[];
  categories: SyncCategory[];
  noteCategoryLinks: SyncNoteCategory[];
  serverTime: string;
}

/**
 * Backward/alternate aliases so the rest of the codebase can migrate gradually.
 */
export type NoteChange = SyncNoteChange;
export type CategoryChange = SyncCategoryChange;
export type NoteCategoryChange = SyncNoteCategoryChange;
export type SyncRequest = SyncRequestBody;