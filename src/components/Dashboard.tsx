import TodayFocus from "./TodayFocus";
import WeeklyLoad from "./WeeklyLoad";
import type { CalendarEvent } from "../types/calendar";
import UBAPanel from "./UBAPanel";
import CambridgeTracker from "./CambridgeTracker";
import WorkInbox from "./WorkInbox";
import Scratchpad from "./Scratchpad";
import FinancePanel from "./FinancePanel";
import RentPanel from "./RentPanel";
import {
  WEEKLY_BLOCKS,
  INITIAL_UBA_SECTIONS,
  INITIAL_CAMBRIDGE_GOALS,
  INITIAL_INBOX,
} from "../data/state";
import type { FocusMode } from "./AppHeader";

const ESTUDIO_SUBTITLE = "2° cuatrimestre 2026 — UBA + Cambridge";

interface DashboardProps {
  focus: FocusMode;
  locked: boolean;
  calendarEvents: CalendarEvent[];
  calendarFromCache?: boolean;
  calendarError?: string | null;
  calendarLoading?: boolean;
}

export default function Dashboard({
  focus,
  locked,
  calendarEvents,
  calendarFromCache = false,
  calendarError = null,
  calendarLoading = false,
}: DashboardProps) {
  const isFinance = focus === "finanzas";
  const isAlquiler = focus === "alquiler";
  const isFullPanel = isFinance || isAlquiler;
  const isEstudio = focus === "estudio";
  const showAcademic = !isFullPanel && (focus === "todo" || isEstudio);
  const showWork = !isFullPanel && (focus === "todo" || focus === "trabajo");
  const showWeekly = !isFullPanel;
  const stretchInbox = focus === "todo" && showAcademic && showWork;

  return (
    <main className="mx-auto max-w-5xl px-6 pt-8 pb-16">
      {isFinance ? (
        <FinancePanel locked={locked} />
      ) : isAlquiler ? (
        <RentPanel locked={locked} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2 lg:items-stretch">
          {showWeekly && (
            <div className="lg:col-span-2">
              <WeeklyLoad blocks={WEEKLY_BLOCKS} locked={locked} />
            </div>
          )}

          {isEstudio && (
            <div
              data-tauri-drag-region=""
              className="lg:col-span-2 -mb-1"
            >
              <h2 className="text-lg font-semibold tracking-tight text-neutral-100">
                Estudio
              </h2>
              <p className="mt-1 text-sm text-neutral-500">{ESTUDIO_SUBTITLE}</p>
            </div>
          )}

          {showAcademic && (
            <UBAPanel initialSections={INITIAL_UBA_SECTIONS} locked={locked} />
          )}

          {(showAcademic || showWork) && (
            <div
              className={`flex flex-col gap-5 ${stretchInbox ? "min-h-0 lg:h-full" : ""}`}
            >
              {showAcademic && (
                <CambridgeTracker
                  initialGoals={INITIAL_CAMBRIDGE_GOALS}
                  locked={locked}
                />
              )}
              {showWork && (
                <WorkInbox
                  initialItems={INITIAL_INBOX}
                  locked={locked}
                  fillHeight={stretchInbox}
                />
              )}
            </div>
          )}

          <div className="lg:col-span-2">
            <TodayFocus
              events={calendarEvents}
              fromCache={calendarFromCache}
              error={calendarError}
              loading={calendarLoading}
            />
          </div>

          <div className="lg:col-span-2">
            <Scratchpad />
          </div>
        </div>
      )}
    </main>
  );
}
