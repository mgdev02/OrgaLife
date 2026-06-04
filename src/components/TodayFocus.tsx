import { useState } from "react";
import { Calendar, ExternalLink } from "lucide-react";
import type { CalendarEvent } from "../types/calendar";
import {
  groupWeekEvents,
  hasWeekUpcoming,
  eventHighlight,
  formatEventStartTime,
} from "../lib/calendarUtils";

interface Props {
  events: CalendarEvent[];
  fromCache?: boolean;
  error?: string | null;
  loading?: boolean;
}

function openEventLink(url: string | null | undefined) {
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

function eventLine(event: CalendarEvent): string {
  const time = formatEventStartTime(event);
  return `${event.title} a las ${time}`;
}

export default function TodayFocus({
  events,
  fromCache = false,
  error = null,
  loading = false,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const now = new Date();
  const dayGroups = groupWeekEvents(events, now);
  const hasUpcoming = hasWeekUpcoming(events, now);

  if (error && !hasUpcoming) {
    const needsReauth =
      /403|insufficient|scope|calendar API/i.test(error);
    return (
      <div className="w-full rounded-xl border border-amber-500/20 bg-amber-500/[0.04] px-4 py-2.5 text-center text-xs text-amber-200/80">
        <span className="font-medium text-amber-300/90">Calendario: </span>
        {needsReauth
          ? "cerrá sesión y volvé a entrar para autorizar Google Calendar."
          : error}
      </div>
    );
  }

  if (loading && !hasUpcoming) return null;
  if (dayGroups.length === 0) return null;

  return (
    <div className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-center">
      <div className="mb-3 flex items-center justify-center gap-2">
        <Calendar className="h-3.5 w-3.5 text-neutral-600" />
        <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-600">
          Esta semana
        </span>
        {fromCache && (
          <span className="text-[10px] text-neutral-700">· sin conexion</span>
        )}
      </div>

      <div className="space-y-4">
        {dayGroups.map((group) => (
          <section key={group.dayKey}>
            <h3 className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-neutral-500">
              {group.label}
            </h3>
            <ul className="space-y-1">
              {group.events.map((event) => {
                const highlight = eventHighlight(event, now, group.date);
                const isExpanded = expandedId === event.id;
                const hasLink = Boolean(event.htmlLink);
                const line = eventLine(event);

                return (
                  <li key={event.id}>
                    <button
                      type="button"
                      data-tauri-no-drag=""
                      onClick={() => {
                        if (hasLink) {
                          openEventLink(event.htmlLink);
                        } else {
                          setExpandedId(isExpanded ? null : event.id);
                        }
                      }}
                      className={`flex w-full flex-wrap items-center justify-center gap-2 rounded-lg border px-3 py-2 text-center transition-all ${
                        highlight === "now"
                          ? "border-amber-500/35 bg-amber-500/[0.06] shadow-[0_0_14px_rgba(245,158,11,0.12)]"
                          : highlight === "soon"
                            ? "border-amber-500/20 bg-amber-500/[0.03]"
                            : "border-transparent bg-transparent hover:border-white/[0.06] hover:bg-white/[0.03]"
                      }`}
                    >
                      <span className="text-sm text-neutral-300">{line}</span>
                      {highlight === "now" && (
                        <span className="shrink-0 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium uppercase text-amber-400">
                          Ahora
                        </span>
                      )}
                      {highlight === "soon" && (
                        <span className="shrink-0 text-[10px] text-amber-500/80">
                          Pronto
                        </span>
                      )}
                      {hasLink && (
                        <ExternalLink className="h-3 w-3 shrink-0 text-neutral-600" />
                      )}
                    </button>
                    {isExpanded && !hasLink && (
                      <p className="px-3 pb-1 text-center text-xs text-neutral-600">
                        Sin enlace al evento en Google Calendar.
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
