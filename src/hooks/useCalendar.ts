import { useCallback, useEffect, useState } from "react";
import { fetchCalendarEvents } from "../lib/calendarAPI";
import {
  loadCalendarCache,
  saveCalendarCache,
} from "../lib/calendarUtils";
import type { CalendarEvent } from "../types/calendar";
import type { SyncStatus } from "../types/sync";

const REFRESH_MS = 15 * 60 * 1000;
const FETCH_RANGE = "week" as const;

export function useCalendar(syncStatus: SyncStatus) {
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    return loadCalendarCache()?.events ?? [];
  });
  const [fromCache, setFromCache] = useState(() => !navigator.onLine);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (preferNetwork = true) => {
    const cached = loadCalendarCache();

    if (!preferNetwork || !navigator.onLine) {
      if (cached) {
        setEvents(cached.events);
        setFromCache(true);
      }
      setError(null);
      return;
    }

    setLoading(true);
    try {
      const fresh = await fetchCalendarEvents(FETCH_RANGE);
      saveCalendarCache(fresh, FETCH_RANGE);
      setEvents(fresh);
      setFromCache(false);
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : String(err);
      setError(message);
      if (cached) {
        setEvents(cached.events);
        setFromCache(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh(navigator.onLine);
  }, [refresh]);

  useEffect(() => {
    if (syncStatus === "offline") {
      const cached = loadCalendarCache();
      if (cached) {
        setEvents(cached.events);
        setFromCache(true);
      }
      return;
    }
    if (
      syncStatus === "synced" ||
      syncStatus === "pending" ||
      syncStatus === "syncing"
    ) {
      void refresh(true);
    }
  }, [syncStatus, refresh]);

  useEffect(() => {
    const onRefresh = () => void refresh(navigator.onLine);
    window.addEventListener("orgalife:calendar-refresh", onRefresh);
    return () =>
      window.removeEventListener("orgalife:calendar-refresh", onRefresh);
  }, [refresh]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (navigator.onLine) void refresh(true);
    }, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  return { events, fromCache, loading, error, refresh } as const;
}
