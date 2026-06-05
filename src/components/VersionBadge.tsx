import { Download, Loader2, RefreshCw } from "lucide-react";
import { APP_VERSION } from "../lib/appVersion";
import { useAppUpdater } from "../hooks/useAppUpdater";

export default function VersionBadge() {
  const {
    isDesktop,
    status,
    availableVersion,
    progress,
    checkForUpdate,
    installUpdate,
  } = useAppUpdater();

  if (!isDesktop) {
    return (
      <span
        data-tauri-drag-region=""
        className="shrink-0 text-[10px] font-medium tabular-nums tracking-wide text-neutral-600"
      >
        v{APP_VERSION}
      </span>
    );
  }

  const showUpdate = status === "available" || status === "downloading";
  const isChecking = status === "checking";

  return (
    <div
      data-tauri-drag-region=""
      className="flex shrink-0 items-center gap-1.5 text-[10px]"
    >
      <span className="font-medium tabular-nums tracking-wide text-neutral-600">
        v{APP_VERSION}
      </span>

      {status !== "downloading" && (
        <button
          type="button"
          data-tauri-no-drag=""
          onClick={() => void checkForUpdate({ force: true })}
          disabled={isChecking}
          className="rounded p-0.5 text-neutral-700 transition-colors hover:bg-white/[0.06] hover:text-neutral-500 disabled:opacity-50"
          title="Buscar actualizaciones"
          aria-label="Buscar actualizaciones"
        >
          <RefreshCw
            className={`h-2.5 w-2.5 ${isChecking ? "animate-spin" : ""}`}
          />
        </button>
      )}

      {showUpdate && (
        <>
          <span className="text-neutral-700" aria-hidden>
            ·
          </span>
          <span className="text-emerald-500/90">Nueva versión disponible</span>
        </>
      )}

      {status === "available" && (
        <button
          type="button"
          data-tauri-no-drag=""
          onClick={() => void installUpdate()}
          className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20"
          title={
            availableVersion
              ? `Instalar v${availableVersion}`
              : "Instalar actualización"
          }
        >
          <Download className="h-2.5 w-2.5" />
          Actualizar
        </button>
      )}

      {status === "downloading" && (
        <span className="inline-flex items-center gap-1 text-neutral-500">
          <Loader2 className="h-2.5 w-2.5 animate-spin" />
          {progress !== null ? `${progress}%` : "Descargando…"}
        </span>
      )}
    </div>
  );
}
