import { invoke } from "@tauri-apps/api/core";
import type { UserProfile } from "../types/auth";

export async function startLogin(): Promise<UserProfile> {
  return invoke<UserProfile>("auth_start_login");
}

export async function checkSession(): Promise<UserProfile | null> {
  return invoke<UserProfile | null>("auth_check_session");
}

export async function logout(): Promise<void> {
  return invoke<void>("auth_logout");
}
