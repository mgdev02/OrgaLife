import { invoke } from "@tauri-apps/api/core";

export async function pushState(data: unknown): Promise<void> {
  return invoke<void>("drive_sync_push", { data });
}

export async function pullState(): Promise<unknown | null> {
  return invoke<unknown | null>("drive_sync_pull");
}
