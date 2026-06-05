import { useCallback, useEffect, useRef, useState } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { isNativeShell } from "../lib/nativeAPI";

export type UpdaterStatus =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "ready"
  | "error";

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

export function useAppUpdater() {
  const [status, setStatus] = useState<UpdaterStatus>("idle");
  const [availableVersion, setAvailableVersion] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pendingUpdate = useRef<Update | null>(null);
  const isDesktop = isNativeShell();

  const checkForUpdate = useCallback(async () => {
    if (!isNativeShell()) return;

    setStatus("checking");
    setError(null);

    try {
      const update = await check();
      if (update) {
        pendingUpdate.current = update;
        setAvailableVersion(update.version);
        setStatus("available");
      } else {
        pendingUpdate.current = null;
        setAvailableVersion(null);
        setStatus("idle");
      }
    } catch (err) {
      pendingUpdate.current = null;
      setAvailableVersion(null);
      console.debug("[updater] check failed:", err);
      setStatus("idle");
    }
  }, []);

  const installUpdate = useCallback(async () => {
    const update = pendingUpdate.current;
    if (!update) return;

    setStatus("downloading");
    setProgress(null);
    setError(null);

    try {
      let downloaded = 0;
      let contentLength = 0;

      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            contentLength = event.data.contentLength ?? 0;
            setProgress(0);
            break;
          case "Progress":
            downloaded += event.data.chunkLength;
            if (contentLength > 0) {
              setProgress(Math.round((downloaded / contentLength) * 100));
            }
            break;
          case "Finished":
            setProgress(100);
            break;
        }
      });

      setStatus("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al instalar");
      setStatus("error");
    }
  }, []);

  const restartApp = useCallback(async () => {
    await relaunch();
  }, []);

  const resetAfterError = useCallback(() => {
    setError(null);
    setProgress(null);
    setStatus(pendingUpdate.current ? "available" : "idle");
  }, []);

  useEffect(() => {
    if (!isDesktop) return;

    const initial = window.setTimeout(() => void checkForUpdate(), 0);
    const id = window.setInterval(() => void checkForUpdate(), CHECK_INTERVAL_MS);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(id);
    };
  }, [isDesktop, checkForUpdate]);

  return {
    isDesktop,
    status,
    availableVersion,
    progress,
    error,
    checkForUpdate,
    installUpdate,
    restartApp,
    resetAfterError,
  };
}
