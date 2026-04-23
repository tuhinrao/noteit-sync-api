import type { SyncTag, SyncTagChange } from "./noteSync";

export interface SyncDayValidationChange {
  clientId: string;
  validationDate: string; // YYYY-MM-DD
  isValidated: boolean;
  validatedAt: string | null;
  note: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface SyncDayValidationTagChange {
  dayValidationClientId: string;
  tagClientId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface SyncTrackedValidationTagChange {
  tagClientId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface DayValidationSyncRequest {
  userEmail: string;
  lastSyncedAt: string | null;
  dayValidationChanges?: SyncDayValidationChange[];
  dayValidationTagChanges?: SyncDayValidationTagChange[];
  trackedValidationTagChanges?: SyncTrackedValidationTagChange[];
  tagChanges?: SyncTagChange[];
  deviceId?: string | null;
}

export interface SyncDayValidation {
  clientId: string;
  userEmail: string;
  validationDate: string; // YYYY-MM-DD
  isValidated: boolean;
  validatedAt: string | null;
  note: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface SyncDayValidationTag {
  dayValidationClientId: string;
  tagClientId: string;
  userEmail: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface SyncTrackedValidationTag {
  tagClientId: string;
  userEmail: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface DayValidationSyncResponse {
  dayValidations: SyncDayValidation[];
  dayValidationTagLinks: SyncDayValidationTag[];
  trackedValidationTags: SyncTrackedValidationTag[];
  tags: SyncTag[];
  serverTime: string;
}

/**
 * Backward aliases for the day validation domain only.
 */
export type DayValidationChange = SyncDayValidationChange;
export type DayValidationTagChange = SyncDayValidationTagChange;
export type TrackedValidationTagChange = SyncTrackedValidationTagChange;