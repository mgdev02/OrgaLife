import { useCallback, useEffect, useRef, useState } from "react";
import * as syncAPI from "../lib/syncAPI";
import type { SyncStatus } from "../types/sync";

const STORAGE_PREFIX = "facu_dashboard_";
const SYNC_DIRTY_KEY = "facu_dashboard_sync_dirty";
const SYNC_TS_KEY = "facu_dashboard_sync_updated_at";
const DEBOUNCE_MS = 5_000;

const SYNCED_KEYS = [
  "ui_locked",
  "weekly_blocks",
  "uba_sections",
  "cambridge_goals",
  "inbox_items",
  "scratchpad_v2",
  "finance_wallets",
  "finance_txns",
  "rent_state",
] as const;

function buildSnapshot(): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const key of SYNCED_KEYS) {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (raw !== null) {
      try {
        data[key] = JSON.parse(raw);
      } catch {
        data[key] = raw;
      }
    }
  }
  data["_updated_at"] = new Date().toISOString();
  return data;
}

function applySnapshot(remote: Record<string, unknown>): void {
  for (const key of SYNCED_KEYS) {
    if (key in remote) {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(remote[key]));
    }
  }
}

function markClean(): void {
  localStorage.removeItem(SYNC_DIRTY_KEY);
  localStorage.setItem(SYNC_TS_KEY, new Date().toISOString());
}

export function markDirty(): void {
  localStorage.setItem(SYNC_DIRTY_KEY, "true");
}

function isDirty(): boolean {
  return localStorage.getItem(SYNC_DIRTY_KEY) === "true";
}

export function useSync() {
  const [status, setStatus] = useState<SyncStatus>(() =>
    navigator.onLine ? "synced" : "offline",
  );
  const [lastSynced, setLastSynced] = useState<Date | null>(() => {
    const ts = localStorage.getItem(SYNC_TS_KEY);
    return ts ? new Date(ts) : null;
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const pushToCloud = useCallback(async () => {
    if (!navigator.onLine) {
      setStatus("offline");
      return;
    }
    setStatus("syncing");
    try {
      const snapshot = buildSnapshot();
      await syncAPI.pushState(snapshot);
      markClean();
      const now = new Date();
      setLastSynced(now);
      if (mountedRef.current) setStatus("synced");
    } catch {
      if (mountedRef.current) setStatus("error");
    }
  }, []);

  const pullFromCloud = useCallback(async (): Promise<boolean> => {
    if (!navigator.onLine) return false;
    try {
      const remote = (await syncAPI.pullState()) as Record<string, unknown> | null;
      if (!remote) return false;

      const localTs = localStorage.getItem(SYNC_TS_KEY);
      const remoteTs = (remote["_updated_at"] as string) || "";

      if (!localTs || remoteTs > localTs) {
        applySnapshot(remote);
        markClean();
        setLastSynced(new Date());
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const schedulePush = useCallback(() => {
    markDirty();
    if (!navigator.onLine) {
      setStatus("offline");
      return;
    }
    setStatus("pending");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void pushToCloud();
    }, DEBOUNCE_MS);
  }, [pushToCloud]);

  const forceSync = useCallback(async () => {
    if (isDirty()) {
      await pushToCloud();
    } else {
      const pulled = await pullFromCloud();
      if (pulled) window.dispatchEvent(new Event("orgalife:sync-pulled"));
    }
  }, [pushToCloud, pullFromCloud]);

  useEffect(() => {
    mountedRef.current = true;

    const handleOnline = () => {
      if (isDirty()) {
        void pushToCloud();
      } else {
        setStatus("synced");
        void pullFromCloud().then((pulled) => {
          if (pulled) window.dispatchEvent(new Event("orgalife:sync-pulled"));
        });
        window.dispatchEvent(new Event("orgalife:calendar-refresh"));
      }
    };

    const handleOffline = () => {
      setStatus("offline");
      window.dispatchEvent(new Event("orgalife:calendar-refresh"));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (navigator.onLine) {
      void pullFromCloud().then((pulled) => {
        if (pulled) window.dispatchEvent(new Event("orgalife:sync-pulled"));
        if (isDirty()) void pushToCloud();
        window.dispatchEvent(new Event("orgalife:calendar-refresh"));
      });
    }

    return () => {
      mountedRef.current = false;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [pushToCloud, pullFromCloud]);

  return {
    status,
    lastSynced,
    schedulePush,
    forceSync,
  } as const;
}
