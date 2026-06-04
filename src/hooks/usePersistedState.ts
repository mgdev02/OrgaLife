import { useState, useEffect, useCallback } from "react";

const STORAGE_PREFIX = "facu_dashboard_";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {
    /* quota exceeded — silent fail */
  }
}

type SyncNotify = (() => void) | null;

let _syncNotify: SyncNotify = null;

export function setSyncNotify(fn: SyncNotify): void {
  _syncNotify = fn;
}

export default function usePersistedState<T>(
  key: string,
  fallback: T,
): [T, (updater: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => read(key, fallback));

  useEffect(() => {
    write(key, state);
    _syncNotify?.();
  }, [key, state]);

  useEffect(() => {
    const handlePull = () => setState(read(key, fallback));
    window.addEventListener("orgalife:sync-pulled", handlePull);
    return () => window.removeEventListener("orgalife:sync-pulled", handlePull);
  }, [key, fallback]);

  const set = useCallback(
    (updater: T | ((prev: T) => T)) => setState(updater),
    [],
  );

  return [state, set];
}
