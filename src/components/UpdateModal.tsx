import { useEffect, useId } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, RefreshCw } from "lucide-react";
import { APP_VERSION } from "../lib/appVersion";
import type { UpdaterStatus } from "../hooks/useAppUpdater";

interface UpdateModalProps {
  open: boolean;
  status: UpdaterStatus;
  availableVersion: string | null;
  progress: number | null;
  error: string | null;
  onRestart: () => void;
  onRetry: () => void;
  onClose: () => void;
}

export default function UpdateModal({
  open,
  status,
  availableVersion,
  progress,
  error,
  onRestart,
  onRetry,
  onClose,
}: UpdateModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && status !== "downloading") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, status, onClose]);

  if (!open) return null;

  const pct = progress ?? 0;
  const isDownloading = status === "downloading";
  const isReady = status === "ready";
  const isError = status === "error";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-6"
      data-tauri-no-drag=""
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
        aria-hidden
      />

      <div className="relative w-full max-w-xs rounded-2xl border border-white/[0.08] bg-[#121216] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        {isReady ? (
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/25">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
            <h2
              id={titleId}
              className="text-sm font-medium text-neutral-100"
            >
              Actualización instalada
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-neutral-500">
              v{APP_VERSION}
              {availableVersion ? ` → v${availableVersion}` : ""}. Reiniciá la
              app para aplicar los cambios.
            </p>
            <button
              type="button"
              data-tauri-no-drag=""
              onClick={() => void onRestart()}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500/90 px-4 py-2.5 text-sm font-medium text-neutral-950 transition-colors hover:bg-emerald-400"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reiniciar ahora
            </button>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-red-500/10 ring-1 ring-red-500/20">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <h2
              id={titleId}
              className="text-sm font-medium text-neutral-100"
            >
              No se pudo actualizar
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-neutral-500">
              {error ?? "Ocurrió un error inesperado."}
            </p>
            <div className="mt-5 flex w-full gap-2">
              <button
                type="button"
                data-tauri-no-drag=""
                onClick={onClose}
                className="flex-1 rounded-xl border border-white/[0.08] px-3 py-2 text-xs font-medium text-neutral-400 transition-colors hover:bg-white/[0.04] hover:text-neutral-300"
              >
                Cerrar
              </button>
              <button
                type="button"
                data-tauri-no-drag=""
                onClick={() => void onRetry()}
                className="flex-1 rounded-xl bg-white/[0.08] px-3 py-2 text-xs font-medium text-neutral-200 transition-colors hover:bg-white/[0.12]"
              >
                Reintentar
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20">
                <ArrowRight className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h2
                  id={titleId}
                  className="text-sm font-medium text-neutral-100"
                >
                  Actualizando versión
                </h2>
                <p className="mt-0.5 text-xs text-neutral-500">
                  v{APP_VERSION}
                  {availableVersion ? (
                    <>
                      {" "}
                      <span className="text-neutral-600">→</span> v
                      {availableVersion}
                    </>
                  ) : null}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] tabular-nums text-neutral-500">
                <span>{isDownloading ? "Descargando e instalando…" : "Preparando…"}</span>
                <span className="font-medium text-neutral-400">
                  {progress !== null ? `${pct}%` : "—"}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-[width] duration-300 ease-out"
                  style={{ width: `${Math.max(pct, progress === null ? 8 : 0)}%` }}
                />
              </div>
            </div>

            <p className="mt-4 text-center text-[10px] text-neutral-600">
              No cierres la app hasta que termine.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
