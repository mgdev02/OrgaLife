import { invoke } from "@tauri-apps/api/core";
import { isNativeShell } from "./nativeAPI";
import { fileToBase64 } from "./rentUtils";

export interface AttachmentDownload {
  fileName: string;
  mimeType: string;
  dataBase64: string;
}

/** Valor para `accept` del input de comprobantes. */
export const ATTACHMENT_ACCEPT = "image/*,application/pdf,.pdf";

export const ATTACHMENT_FORMATS_HINT =
  "Solo PDF e imágenes (JPG, PNG, WEBP…) — se pueden previsualizar en la app.";

const PREVIEWABLE_EXT = /\.(pdf|jpe?g|png|gif|webp|heic|heif)$/i;

export function isPreviewableAttachmentFile(
  file: Pick<File, "name" | "type">,
): boolean {
  const mime = file.type.toLowerCase();
  if (mime.startsWith("image/")) return true;
  if (mime === "application/pdf") return true;
  return PREVIEWABLE_EXT.test(file.name);
}

export function isPreviewableAttachmentData(
  mimeType: string,
  fileName: string,
): boolean {
  const mime = mimeType.toLowerCase();
  if (mime.startsWith("image/")) return true;
  if (mime === "application/pdf") return true;
  return PREVIEWABLE_EXT.test(fileName);
}

/** `null` si el archivo es válido; mensaje de error si no. */
export function attachmentValidationError(file: File): string | null {
  if (isPreviewableAttachmentFile(file)) return null;
  return `“${file.name}” no es compatible. ${ATTACHMENT_FORMATS_HINT}`;
}

export async function uploadAttachment(
  file: File,
): Promise<string> {
  if (!isNativeShell()) {
    throw new Error("Los comprobantes solo se pueden subir en la app de escritorio.");
  }

  const invalid = attachmentValidationError(file);
  if (invalid) throw new Error(invalid);

  const dataBase64 = await fileToBase64(file);

  return invoke<string>("drive_upload_attachment", {
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    dataBase64,
  });
}

export async function downloadAttachment(
  fileId: string,
): Promise<AttachmentDownload> {
  return invoke<AttachmentDownload>("drive_download_attachment", {
    fileId,
  });
}

export function createAttachmentBlobUrl(data: AttachmentDownload): string {
  const binary = atob(data.dataBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: data.mimeType });
  return URL.createObjectURL(blob);
}

export function openAttachmentInBrowser(data: AttachmentDownload): void {
  const url = createAttachmentBlobUrl(data);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
