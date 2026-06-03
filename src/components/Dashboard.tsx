import { useState } from "react";
import { Calendar, Lock, Unlock } from "lucide-react";
import WeeklyLoad from "./WeeklyLoad";
import UBAPanel from "./UBAPanel";
import CambridgeTracker from "./CambridgeTracker";
import WorkInbox from "./WorkInbox";
import Scratchpad from "./Scratchpad";
import FinancePanel from "./FinancePanel";
import usePersistedState from "../hooks/usePersistedState";
import { useNativePlatform } from "../hooks/useNativePlatform";
import {
  WEEKLY_BLOCKS,
  INITIAL_UBA_SECTIONS,
  INITIAL_CAMBRIDGE_GOALS,
  INITIAL_INBOX,
} from "../data/state";

type FocusMode = "todo" | "sistemas" | "facultad" | "finanzas";

const FOCUS_OPTIONS: { value: FocusMode; label: string }[] = [
  { value: "todo", label: "Todo" },
  { value: "sistemas", label: "Sistemas" },
  { value: "facultad", label: "Facultad" },
  { value: "finanzas", label: "Finanzas" },
];

function currentDateLabel(): string {
  return new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function Dashboard() {
  const [focus, setFocus] = useState<FocusMode>("todo");
  const [locked, setLocked] = usePersistedState<boolean>("ui_locked", false);
  const platform = useNativePlatform();
  const isMac = platform === "darwin";

  const isFinance = focus === "finanzas";
  const showAcademic = !isFinance && (focus === "todo" || focus === "facultad");
  const showWork = !isFinance && (focus === "todo" || focus === "sistemas");
  const showWeekly = !isFinance;

  return (
    <div
      className={`min-h-screen bg-[#0c0c0f] text-neutral-100 antialiased${locked ? " execution-mode" : ""}`}
    >
      <header
        data-tauri-drag-region=""
        className="w-full shrink-0"
      >
        <div
          data-tauri-drag-region=""
          className={`mx-auto max-w-5xl px-6 pb-6 ${isMac ? "pl-20" : "pl-6"}`}
        >
          <div
            data-tauri-drag-region=""
            className="h-11 w-full"
            aria-hidden
          />

          <div
            data-tauri-drag-region=""
            className="flex items-end justify-between border-b border-white/[0.06] pb-5"
          >
            <div data-tauri-drag-region="" className="min-w-0 flex-1 pr-6">
              <h1
                data-tauri-drag-region=""
                className={`text-2xl font-semibold tracking-tight text-neutral-100${locked ? " enable-selection" : ""}`}
              >
                Panel de Organización
              </h1>
              <p
                data-tauri-drag-region=""
                className={`mt-1 text-sm text-neutral-500${locked ? " enable-selection" : ""}`}
              >
                2° cuatrimestre 2026 — Trabajo + UBA + Cambridge
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                data-tauri-no-drag=""
                onClick={() => setLocked((v) => !v)}
                className={`rounded-lg border p-1.5 transition-all ${
                  locked
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                    : "border-white/[0.06] bg-transparent text-neutral-600 hover:bg-white/[0.04] hover:text-neutral-400"
                }`}
                title={
                  locked
                    ? "Modo Ejecución — click para desbloquear"
                    : "Click para bloquear edición"
                }
              >
                {locked ? (
                  <Lock className="h-3.5 w-3.5" />
                ) : (
                  <Unlock className="h-3.5 w-3.5" />
                )}
              </button>

              <div
                data-tauri-no-drag=""
                className="flex rounded-lg border border-white/[0.06] bg-white/[0.03] p-0.5"
              >
                {FOCUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    data-tauri-no-drag=""
                    onClick={() => setFocus(opt.value)}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                      focus === opt.value
                        ? "bg-white/[0.08] text-neutral-200"
                        : "text-neutral-600 hover:text-neutral-400"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div
                data-tauri-drag-region=""
                className="flex items-center gap-1.5 text-xs text-neutral-600"
              >
                <Calendar className="h-3.5 w-3.5 pointer-events-none" />
                <span className="pointer-events-none capitalize">
                  {currentDateLabel()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-16">
        {isFinance ? (
          <FinancePanel locked={locked} />
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {showWeekly && (
              <div className="lg:col-span-2">
                <WeeklyLoad blocks={WEEKLY_BLOCKS} locked={locked} />
              </div>
            )}

            {showAcademic && (
              <UBAPanel initialSections={INITIAL_UBA_SECTIONS} locked={locked} />
            )}

            {(showAcademic || showWork) && (
              <div className="flex flex-col gap-5">
                {showAcademic && (
                  <CambridgeTracker
                    initialGoals={INITIAL_CAMBRIDGE_GOALS}
                    locked={locked}
                  />
                )}
                {showWork && (
                  <WorkInbox initialItems={INITIAL_INBOX} locked={locked} />
                )}
              </div>
            )}

            <div className="lg:col-span-2">
              <Scratchpad />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
