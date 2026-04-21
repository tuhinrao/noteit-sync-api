import { runSync as runSyncStore } from "../utils/syncStore";
import { SyncRequest, SyncResponse } from "../types/sync";

export async function runSync(input: SyncRequest): Promise<SyncResponse> {
  return runSyncStore(input);
}