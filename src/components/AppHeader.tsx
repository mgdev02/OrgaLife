import { Calendar, Lock, Unlock, LogOut } from "lucide-react";
import { useNativePlatform } from "../hooks/useNativePlatform";
import { APP_VERSION } from "../lib/appVersion";
import SyncIndicator from "./SyncIndicator";
import { GoogleCalendarIcon, GoogleDriveIcon } from "./GoogleServiceIcons";
import type { UserProfile } from "../types/auth";
import type { SyncStatus } from "../types/sync";

type FocusMode = "todo" | "trabajo" | "estudio" | "finanzas" | "alquiler";

const FOCUS_OPTIONS: { value: FocusMode; label: string }[] = [
  { value: "todo", label: "Todo" },
  { value: "trabajo", label: "Trabajo" },
  { value: "estudio", label: "Estudio" },
  { value: "finanzas", label: "Finanzas" },
  { value: "alquiler", label: "Alquiler" },
];

function currentDateLabel(): string {
  return new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

interface AppHeaderProps {
  user: UserProfile;
  onLogout: () => void;
  focus: FocusMode;
  onFocusChange: (mode: FocusMode) => void;
  locked: boolean;
  onLockedChange: (locked: boolean) => void;
  syncStatus: SyncStatus;
  onSyncRetry: () => void;
}

export type { FocusMode };

function AccountSubheader({
  user,
  syncStatus,
  onSyncRetry,
  onLogout,
}: {
  user: UserProfile;
  syncStatus: SyncStatus;
  onSyncRetry: () => void;
  onLogout: () => void;
}) {
  return (
    <div
      data-tauri-no-drag=""
      className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/[0.06] bg-[#0c0c0f]/80 py-0.5 pl-2 pr-1 backdrop-blur-sm"
    >
      <SyncIndicator status={syncStatus} onRetry={onSyncRetry} />
      <div
        className="flex items-center gap-1 opacity-90"
        role="group"
        aria-label="Google Drive y Google Calendar"
      >
        <GoogleDriveIcon />
        <GoogleCalendarIcon />
      </div>
      <span className="h-3 w-px shrink-0 bg-white/[0.08]" aria-hidden />
      <img
        src={user.picture}
        alt=""
        className="h-5 w-5 shrink-0 rounded-full border border-white/10 object-cover"
        referrerPolicy="no-referrer"
      />
      <span
        className="max-w-[140px] truncate text-[10px] leading-none text-neutral-400"
        title={user.name}
      >
        {user.name}
      </span>
      <button
        type="button"
        onClick={onLogout}
        className="rounded-full p-1 text-neutral-600 transition-colors hover:bg-white/[0.06] hover:text-neutral-400"
        title="Cerrar sesion"
      >
        <LogOut className="h-3 w-3" />
      </button>
    </div>
  );
}

export default function AppHeader({
  user,
  onLogout,
  focus,
  onFocusChange,
  locked,
  onLockedChange,
  syncStatus,
  onSyncRetry,
}: AppHeaderProps) {
  const platform = useNativePlatform();
  const isMac = platform === "darwin";

  return (
    <header className="sticky top-0 z-40 w-full shrink-0 border-b border-white/[0.06] bg-[#0c0c0f]/95 backdrop-blur-md">
      {/* Subheader: fecha · versión · cuenta */}
      <div
        className={`relative grid h-11 w-full grid-cols-[1fr_auto_1fr] items-center gap-2 ${isMac ? "pl-20" : "pl-3"} pr-2`}
      >
        <div
          data-tauri-drag-region=""
          className="flex min-w-0 items-center gap-1.5 text-[10px] text-neutral-500"
        >
          <Calendar className="h-3 w-3 shrink-0 pointer-events-none" />
          <span className="truncate capitalize">{currentDateLabel()}</span>
        </div>

        <span
          data-tauri-drag-region=""
          className="shrink-0 text-[10px] font-medium tabular-nums tracking-wide text-neutral-600"
        >
          v{APP_VERSION}
        </span>

        <div className="flex justify-end">
          <AccountSubheader
            user={user}
            syncStatus={syncStatus}
            onSyncRetry={onSyncRetry}
            onLogout={onLogout}
          />
        </div>
      </div>

      {/* Header principal */}
      <div
        data-tauri-drag-region=""
        className={`mx-auto max-w-5xl px-6 pb-6 ${isMac ? "pl-20" : "pl-6"}`}
      >
        <div
          data-tauri-drag-region=""
          className="flex items-end justify-between pb-5"
        >
          <div data-tauri-drag-region="" className="min-w-0 flex-1 pr-6">
            <h1
              data-tauri-drag-region=""
              className={`text-2xl font-semibold tracking-tight text-neutral-100${locked ? " enable-selection" : ""}`}
            >
              Panel de Organizacion
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              data-tauri-no-drag=""
              onClick={() => onLockedChange(!locked)}
              className={`rounded-lg border p-1.5 transition-all ${
                locked
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                  : "border-white/[0.06] bg-transparent text-neutral-600 hover:bg-white/[0.04] hover:text-neutral-400"
              }`}
              title={
                locked
                  ? "Modo Ejecucion — click para desbloquear"
                  : "Click para bloquear edicion"
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
                  onClick={() => onFocusChange(opt.value)}
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
          </div>
        </div>
      </div>
    </header>
  );
}
