import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { APP_VERSION } from "../lib/appVersion";
import { useAppUpdater } from "../hooks/useAppUpdater";
import UpdateModal from "./UpdateModal";

export default function VersionBadge() {
  const [modalOpen, setModalOpen] = useState(false);
  const {
    isDesktop,
    status,
    availableVersion,
    progress,
    error,
    installUpdate,
    restartApp,
    resetAfterError,
  } = useAppUpdater();

  const handleUpdateClick = () => {
    setModalOpen(true);
    void installUpdate();
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    if (status === "error") resetAfterError();
  };

  const handleRetry = () => {
    void installUpdate();
  };

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

  return (
    <>
      <div
        data-tauri-drag-region=""
        className="flex shrink-0 items-center gap-1.5 text-[10px]"
      >
        <span className="font-medium tabular-nums tracking-wide text-neutral-600">
          v{APP_VERSION}
        </span>

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
            onClick={handleUpdateClick}
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

        {status === "checking" && (
          <Loader2
            className="h-2.5 w-2.5 animate-spin text-neutral-600"
            aria-label="Buscando actualizaciones"
          />
        )}
      </div>

      <UpdateModal
        open={modalOpen}
        status={status}
        availableVersion={availableVersion}
        progress={progress}
        error={error}
        onRestart={() => void restartApp()}
        onRetry={handleRetry}
        onClose={handleCloseModal}
      />
    </>
  );
}
