import { useCallback, useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { isNativeShell } from "../lib/nativeAPI";

export type UpdaterStatus =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "error";

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const AUTO_CHECK_COOLDOWN_MS = 2 * 60 * 1000;

type CheckOptions = {
  force?: boolean;
};

export function useAppUpdater() {
  const [status, setStatus] = useState<UpdaterStatus>("idle");
  const [availableVersion, setAvailableVersion] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pendingUpdate = useRef<Update | null>(null);
  const busyRef = useRef(false);
  const lastAutoCheckRef = useRef(0);
  const isDesktop = isNativeShell();

  const checkForUpdate = useCallback(async (opts?: CheckOptions) => {
    if (!isNativeShell()) return;
    if (busyRef.current) return;

    const force = opts?.force === true;
    if (
      !force &&
      Date.now() - lastAutoCheckRef.current < AUTO_CHECK_COOLDOWN_MS
    ) {
      return;
    }

    busyRef.current = true;
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
    } finally {
      busyRef.current = false;
      if (!force) lastAutoCheckRef.current = Date.now();
    }
  }, []);

  const installUpdate = useCallback(async () => {
    const update = pendingUpdate.current;
    if (!update || busyRef.current) return;

    busyRef.current = true;
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

      await relaunch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al instalar");
      setStatus("available");
      busyRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!isDesktop) return;

    const initial = window.setTimeout(() => void checkForUpdate(), 0);
    const interval = window.setInterval(
      () => void checkForUpdate(),
      CHECK_INTERVAL_MS,
    );

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void checkForUpdate();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    let unlistenWindowShown: (() => void) | undefined;
    void listen("orgalife:window-shown", () => {
      void checkForUpdate();
    }).then((unlisten) => {
      unlistenWindowShown = unlisten;
    });

    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      unlistenWindowShown?.();
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
  };
}
