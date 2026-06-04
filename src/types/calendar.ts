export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  htmlLink?: string | null;
  isAllDay: boolean;
}

export interface CalendarCache {
  fetchedAt: string;
  range: string;
  events: CalendarEvent[];
}

export type CalendarRange = "today" | "week" | "month";
