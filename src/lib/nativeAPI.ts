import { invoke, isTauri } from "@tauri-apps/api/core";

export type NativePlatform = "darwin" | "win32" | "linux" | "web";

let cachedPlatform: NativePlatform | null = null;
const listeners = new Set<(platform: NativePlatform) => void>();

function notify(platform: NativePlatform) {
  cachedPlatform = platform;
  listeners.forEach((fn) => fn(platform));
}

/**
 * Resuelve la plataforma nativa vía Tauri (`native_platform`).
 * Fuera del shell de escritorio devuelve `"web"`.
 */
export async function getNativePlatform(): Promise<NativePlatform> {
  if (cachedPlatform) return cachedPlatform;

  if (isTauri()) {
    const platform = await invoke<NativePlatform>("native_platform");
    notify(platform);
    return platform;
  }

  notify("web");
  return "web";
}

/** `true` cuando la app corre dentro del shell de Tauri. */
export function isNativeShell(): boolean {
  return isTauri();
}

/** `true` en macOS (padding de semáforos, etc.). */
export async function isMacOS(): Promise<boolean> {
  return (await getNativePlatform()) === "darwin";
}

/**
 * Suscripción reactiva a la plataforma (resuelve una vez al montar).
 * Devuelve función de cleanup.
 */
export function subscribeNativePlatform(
  listener: (platform: NativePlatform) => void,
): () => void {
  listeners.add(listener);
  if (cachedPlatform) listener(cachedPlatform);
  else void getNativePlatform().then(listener);
  return () => listeners.delete(listener);
}
