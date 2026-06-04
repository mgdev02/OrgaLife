import { Loader2, RefreshCw } from "lucide-react";
import type { SyncStatus } from "../types/sync";

const STATUS_CONFIG: Record<
  SyncStatus,
  { color: string; pulse: boolean; label: string; textClass: string }
> = {
  synced: {
    color: "bg-emerald-400",
    pulse: false,
    label: "Sincronizado",
    textClass: "text-emerald-500/80",
  },
  pending: {
    color: "bg-amber-400",
    pulse: true,
    label: "Pendiente",
    textClass: "text-amber-500/80",
  },
  syncing: {
    color: "bg-blue-400",
    pulse: true,
    label: "Sincronizando",
    textClass: "text-blue-400/90",
  },
  offline: {
    color: "bg-neutral-500",
    pulse: false,
    label: "Sin conexion",
    textClass: "text-neutral-500",
  },
  error: {
    color: "bg-red-400",
    pulse: false,
    label: "Error",
    textClass: "text-red-400/90",
  },
};

interface SyncIndicatorProps {
  status: SyncStatus;
  onRetry?: () => void;
}

export default function SyncIndicator({ status, onRetry }: SyncIndicatorProps) {
  const { color, pulse, label, textClass } = STATUS_CONFIG[status];

  if (status === "syncing") {
    return (
      <div className={`flex items-center gap-1 ${textClass}`}>
        <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
        <span className="text-[10px] leading-none whitespace-nowrap">{label}</span>
      </div>
    );
  }

  if (status === "error" && onRetry) {
    return (
      <button
        type="button"
        onClick={onRetry}
        className={`flex items-center gap-1 transition-colors hover:opacity-80 ${textClass}`}
        title="Reintentar sincronizacion"
      >
        <RefreshCw className="h-3 w-3 shrink-0" />
        <span className="text-[10px] leading-none whitespace-nowrap">{label}</span>
      </button>
    );
  }

  return (
    <div className={`flex items-center gap-1 ${textClass}`}>
      <span className="relative flex h-2 w-2 shrink-0">
        {pulse && (
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${color}`}
          />
        )}
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${color}`}
        />
      </span>
      <span className="text-[10px] leading-none whitespace-nowrap">{label}</span>
    </div>
  );
}
