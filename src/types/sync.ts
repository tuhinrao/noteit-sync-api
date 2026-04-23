/**
 * Legacy compatibility barrel.
 *
 * New code should import from:
 * - ./syncStatus
 * - ./noteSync
 * - ./dayValidationSync
 * - ./cash
 */

export type { SyncStatus } from "./syncStatus";

export type {
  SyncNoteChange,
  SyncCategoryChange,
  SyncTagChange,
  SyncNoteTagChange,
  SyncNoteImageChange,
  NoteSyncRequest,
  SyncNote,
  SyncCategory,
  SyncTag,
  SyncNoteTag,
  SyncNoteImage,
  NoteSyncResponse,
  NoteChange,
  CategoryChange,
  TagChange,
  NoteTagChange,
  NoteImageChange,
} from "./noteSync";

export type {
  SyncDayValidationChange,
  SyncDayValidationTagChange,
  DayValidationSyncRequest,
  SyncDayValidation,
  SyncDayValidationTag,
  DayValidationSyncResponse,
  DayValidationChange,
  DayValidationTagChange,
} from "./dayValidationSync";

export type {
  CashEntryChange,
  CashSyncRequest,
  SyncCashEntry,
  CashSyncResponse,
} from "./cash";