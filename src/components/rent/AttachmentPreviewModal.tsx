import { useEffect } from "react";
import { X } from "lucide-react";
import { isPreviewableAttachmentData } from "../../lib/driveAttachmentsAPI";

interface Props {
  fileName: string;
  mimeType: string;
  blobUrl: string;
  onClose: () => void;
}

export default function AttachmentPreviewModal({
  fileName,
  mimeType,
  blobUrl,
  onClose,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const isImage = mimeType.startsWith("image/");
  const isPdf =
    mimeType === "application/pdf" ||
    fileName.toLowerCase().endsWith(".pdf");
  const canPreview = isPreviewableAttachmentData(mimeType, fileName);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      data-tauri-no-drag=""
      role="dialog"
      aria-modal="true"
      aria-label={`Vista previa: ${fileName}`}
    >
      <button
        type="button"
        data-tauri-no-drag=""
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
        onClick={onClose}
        aria-label="Cerrar vista previa"
      />

      <div className="relative flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121216] shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <header className="flex shrink-0 items-center gap-3 border-b border-white/[0.06] px-4 py-3">
          <p className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-200">
            {fileName}
          </p>
          <button
            type="button"
            data-tauri-no-drag=""
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-white/[0.06] hover:text-neutral-300"
            title="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex min-h-[50vh] flex-1 items-center justify-center overflow-auto bg-[#0a0a0c] p-4">
          {isImage && (
            <img
              src={blobUrl}
              alt={fileName}
              className="max-h-[75vh] max-w-full rounded-lg object-contain shadow-lg"
            />
          )}

          {isPdf && (
            <iframe
              src={blobUrl}
              title={fileName}
              className="h-[75vh] w-full rounded-lg border border-white/[0.06] bg-white"
            />
          )}

          {!canPreview && (
            <div className="max-w-sm text-center">
              <p className="mb-2 text-sm text-neutral-400">
                No hay vista previa para este archivo.
              </p>
              <p className="mb-4 text-xs text-neutral-600">
                Quitá el comprobante y subí un PDF o una imagen para verlo acá.
              </p>
              <a
                href={blobUrl}
                download={fileName}
                data-tauri-no-drag=""
                className="text-sm text-neutral-300 underline underline-offset-2 hover:text-white"
              >
                Descargar {fileName}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
