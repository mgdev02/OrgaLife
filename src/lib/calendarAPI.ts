import { invoke } from "@tauri-apps/api/core";
import { isNativeShell } from "./nativeAPI";
import type { CalendarEvent, CalendarRange } from "../types/calendar";

export async function fetchCalendarEvents(
  range: CalendarRange = "week",
): Promise<CalendarEvent[]> {
  if (!isNativeShell()) return [];
  return invoke<CalendarEvent[]>("fetch_calendar_events", { range });
}

export async function fetchTodayEvents(): Promise<CalendarEvent[]> {
  if (!isNativeShell()) return [];
  return invoke<CalendarEvent[]>("fetch_today_events");
}
