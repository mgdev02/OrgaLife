import type { CalendarEvent } from "../types/calendar";

const STORAGE_PREFIX = "facu_dashboard_";
export const CALENDAR_CACHE_KEY = `${STORAGE_PREFIX}calendar_cache`;

export function startOfLocalDay(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function endOfLocalDay(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

export function parseEventDate(iso: string): Date {
  if (iso.length === 10) {
    return new Date(`${iso}T12:00:00`);
  }
  return new Date(iso);
}

/** Eventos que ocurren hoy (incluye los que empezaron antes y siguen). */
export function eventsForToday(events: CalendarEvent[], now = new Date()): CalendarEvent[] {
  const dayStart = startOfLocalDay(now).getTime();
  const dayEnd = endOfLocalDay(now).getTime();

  return events
    .filter((e) => {
      const start = parseEventDate(e.start).getTime();
      const end = parseEventDate(e.end).getTime();
      return start <= dayEnd && end >= dayStart;
    })
    .sort((a, b) => parseEventDate(a.start).getTime() - parseEventDate(b.start).getTime());
}

export type EventHighlight = "now" | "soon" | null;

const SOON_MS = 2 * 60 * 60 * 1000;

export function eventHighlight(
  event: CalendarEvent,
  now = new Date(),
  onDay?: Date,
): EventHighlight {
  if (event.isAllDay) return null;
  const refDay = onDay ?? now;
  const dayStart = startOfLocalDay(refDay).getTime();
  const dayEnd = endOfLocalDay(refDay).getTime();
  const start = parseEventDate(event.start).getTime();
  const end = parseEventDate(event.end).getTime();
  if (start > dayEnd || end < dayStart) return null;

  const t = now.getTime();
  if (t >= start && t < end) return "now";
  if (start > t && start - t <= SOON_MS) return "soon";
  return null;
}

export function pickFeaturedEvent(
  events: CalendarEvent[],
  now = new Date(),
): CalendarEvent | null {
  const today = eventsForToday(events, now);
  if (today.length === 0) return null;

  const nowEv = today.find((e) => eventHighlight(e, now) === "now");
  if (nowEv) return nowEv;

  const soonEv = today.find((e) => eventHighlight(e, now) === "soon");
  if (soonEv) return soonEv;

  const upcoming = today.find(
    (e) => parseEventDate(e.start).getTime() >= now.getTime(),
  );
  return upcoming ?? today[0];
}

export interface DayEventGroup {
  date: Date;
  dayKey: string;
  label: string;
  events: CalendarEvent[];
}

export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function startOfWeekMonday(d = new Date()): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  return startOfLocalDay(mon);
}

export function endOfWeekSunday(d = new Date()): Date {
  const mon = startOfWeekMonday(d);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return endOfLocalDay(sun);
}

export function dayLabel(day: Date, now = new Date()): string {
  const t = startOfLocalDay(day).getTime();
  const today = startOfLocalDay(now).getTime();
  const tomorrow = startOfLocalDay(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (t === today) return "Hoy";
  if (t === tomorrow.getTime()) return "Mañana";
  const name = day.toLocaleDateString("es-AR", { weekday: "long" });
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function eventsForDay(
  events: CalendarEvent[],
  day: Date,
): CalendarEvent[] {
  const dayStart = startOfLocalDay(day).getTime();
  const dayEnd = endOfLocalDay(day).getTime();

  return events
    .filter((e) => {
      const start = parseEventDate(e.start).getTime();
      const end = parseEventDate(e.end).getTime();
      return start <= dayEnd && end >= dayStart;
    })
    .sort(
      (a, b) =>
        parseEventDate(a.start).getTime() - parseEventDate(b.start).getTime(),
    );
}

/** Quita eventos ya terminados en el día actual; días futuros se mantienen enteros. */
export function dropEndedOnDay(
  events: CalendarEvent[],
  day: Date,
  now = new Date(),
): CalendarEvent[] {
  const dayStart = startOfLocalDay(day).getTime();
  const todayStart = startOfLocalDay(now).getTime();
  if (dayStart > todayStart) return events;
  if (dayStart < todayStart) return [];
  return events.filter((e) => parseEventDate(e.end).getTime() > now.getTime());
}

export function groupWeekEvents(
  events: CalendarEvent[],
  now = new Date(),
): DayEventGroup[] {
  const weekStart = startOfWeekMonday(now);
  const weekEnd = endOfWeekSunday(now);
  const from =
    startOfLocalDay(now).getTime() > weekStart.getTime()
      ? startOfLocalDay(now)
      : weekStart;

  const groups: DayEventGroup[] = [];
  const cursor = new Date(from);

  while (cursor.getTime() <= weekEnd.getTime()) {
    const day = startOfLocalDay(cursor);
    const dayEvents = dropEndedOnDay(eventsForDay(events, day), day, now);
    if (dayEvents.length > 0) {
      groups.push({
        date: day,
        dayKey: dayKey(day),
        label: dayLabel(day, now),
        events: dayEvents,
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return groups;
}

export function hasWeekUpcoming(
  events: CalendarEvent[],
  now = new Date(),
): boolean {
  return groupWeekEvents(events, now).length > 0;
}

export function formatEventStartTime(event: CalendarEvent): string {
  if (event.isAllDay) return "todo el día";
  return parseEventDate(event.start).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatEventTime(event: CalendarEvent): string {
  if (event.isAllDay) return "Todo el día";
  const start = parseEventDate(event.start);
  const end = parseEventDate(event.end);
  const fmt: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
  };
  const a = start.toLocaleTimeString("es-AR", fmt);
  const b = end.toLocaleTimeString("es-AR", fmt);
  if (a === b) return a;
  return `${a} – ${b}`;
}

export function loadCalendarCache(): import("../types/calendar").CalendarCache | null {
  try {
    const raw = localStorage.getItem(CALENDAR_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as import("../types/calendar").CalendarCache;
  } catch {
    return null;
  }
}

export function saveCalendarCache(
  events: CalendarEvent[],
  range: string,
): void {
  const payload: import("../types/calendar").CalendarCache = {
    fetchedAt: new Date().toISOString(),
    range,
    events,
  };
  localStorage.setItem(CALENDAR_CACHE_KEY, JSON.stringify(payload));
}
