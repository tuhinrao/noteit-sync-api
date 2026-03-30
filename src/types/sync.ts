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
  categoryClientId: string | null;
  isPinned: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface SyncCategoryChange {
  clientId: string;
  name: string;
  colorHex: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface SyncTagChange {
  clientId: string;
  name: string;
  colorHex: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface SyncNoteTagChange {
  noteClientId: string;
  tagClientId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface SyncRequestBody {
  userEmail: string;
  lastSyncedAt: string | null;
  noteChanges: SyncNoteChange[];
  categoryChanges: SyncCategoryChange[];
  tagChanges: SyncTagChange[];
  noteTagChanges: SyncNoteTagChange[];
  deviceId?: string | null;
}

export interface SyncNote {
  clientId: string;
  userEmail: string;
  title: string;
  body: string;
  categoryClientId: string | null;
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
  colorHex: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface SyncTag {
  clientId: string;
  userEmail: string;
  name: string;
  colorHex: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface SyncNoteTag {
  noteClientId: string;
  tagClientId: string;
  userEmail: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface SyncResponse {
  notes: SyncNote[];
  categories: SyncCategory[];
  tags: SyncTag[];
  noteTagLinks: SyncNoteTag[];
  serverTime: string;
}

/**
 * Backward/alternate aliases so the rest of the codebase can migrate gradually.
 */
export type NoteChange = SyncNoteChange;
export type CategoryChange = SyncCategoryChange;
export type TagChange = SyncTagChange;
export type NoteTagChange = SyncNoteTagChange;
export type SyncRequest = SyncRequestBody;