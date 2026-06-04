import { useRef, useState, useCallback } from "react";
import usePersistedState from "../hooks/usePersistedState";
import {
  uploadAttachment,
  downloadAttachment,
  createAttachmentBlobUrl,
  ATTACHMENT_ACCEPT,
  attachmentValidationError,
  type AttachmentDownload,
} from "../lib/driveAttachmentsAPI";
import {
  listRentMonths,
  findPayment,
  upsertPayment,
  migrateRentState,
  setMonthAmount,
} from "../lib/rentUtils";
import {
  INITIAL_RENT_STATE,
  type RentState,
  type RentService,
} from "../types/rent";
import RentHeader from "./rent/RentHeader";
import RentForm from "./rent/RentForm";
import RentGrid from "./rent/RentGrid";
import AttachmentPreviewModal from "./rent/AttachmentPreviewModal";

interface Props {
  locked?: boolean;
}

type PendingUpload = { month: string; target: string };

export default function RentPanel({ locked = false }: Props) {
  const [rawState, setRawState] = usePersistedState<RentState>(
    "rent_state",
    INITIAL_RENT_STATE,
  );
  const state = migrateRentState(rawState);

  const setState = useCallback(
    (updater: RentState | ((prev: RentState) => RentState)) => {
      setRawState((prev) => {
        const base = migrateRentState(prev);
        const next =
          typeof updater === "function" ? updater(base) : updater;
        return migrateRentState(next);
      });
    },
    [setRawState],
  );

  const [draftService, setDraftService] = useState({
    name: "",
    amount: 0,
  });
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(
    null,
  );
  const [attachmentBusy, setAttachmentBusy] = useState<PendingUpload | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<
    (AttachmentDownload & { blobUrl: string }) | null
  >(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const closePreview = useCallback(() => {
    setPreview((current) => {
      if (current?.blobUrl) URL.revokeObjectURL(current.blobUrl);
      return null;
    });
  }, []);

  const configured =
    Boolean(state.contractStart) && state.monthlyRent > 0;
  const months = configured
    ? listRentMonths(state.contractStart, state.contractDurationYears)
    : [];

  const updateConfig = (patch: Partial<RentState>) => {
    setState((s) => ({ ...s, ...patch }));
  };

  const addService = () => {
    const name = draftService.name.trim();
    const amount = draftService.amount;
    if (!name || amount < 0) return;
    const service: RentService = {
      id: crypto.randomUUID(),
      name,
      referenceAmount: amount,
    };
    setState((s) => ({ ...s, services: [...s.services, service] }));
    setDraftService({ name: "", amount: 0 });
  };

  const removeService = (id: string) => {
    setState((s) => {
      const nextMonthAmounts = { ...s.monthAmounts };
      for (const month of Object.keys(nextMonthAmounts)) {
        if (nextMonthAmounts[month][id] !== undefined) {
          const { [id]: _, ...rest } = nextMonthAmounts[month];
          nextMonthAmounts[month] = rest;
        }
      }
      return {
        ...s,
        services: s.services.filter((x) => x.id !== id),
        payments: s.payments.filter((p) => p.target !== id),
        monthAmounts: nextMonthAmounts,
      };
    });
  };

  const updateMonthAmount = (
    month: string,
    target: string,
    value: number,
  ) => {
    setState((s) => setMonthAmount(s, month, target, value));
  };

  const togglePaid = (month: string, target: string) => {
    setState((s) => {
      const existing = findPayment(s.payments, month, target);
      const paidAt = existing?.paidAt
        ? null
        : new Date().toISOString().slice(0, 10);
      return {
        ...s,
        payments: upsertPayment(s.payments, month, target, { paidAt }),
      };
    });
  };

  const pickAttachment = (month: string, target: string) => {
    setPendingUpload({ month, target });
    fileRef.current?.click();
  };

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !pendingUpload) return;

    const invalid = attachmentValidationError(file);
    if (invalid) {
      setPendingUpload(null);
      setError(invalid);
      return;
    }

    const { month, target } = pendingUpload;
    setPendingUpload(null);
    setAttachmentBusy({ month, target });
    setError(null);
    try {
      const driveFileId = await uploadAttachment(file);
      const today = new Date().toISOString().slice(0, 10);
      setState((s) => ({
        ...s,
        payments: upsertPayment(s.payments, month, target, {
          paidAt: today,
          attachment: {
            driveFileId,
            fileName: file.name,
            mimeType: file.type || "application/octet-stream",
          },
        }),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAttachmentBusy(null);
    }
  };

  const viewAttachment = async (
    month: string,
    target: string,
    driveFileId: string,
  ) => {
    setAttachmentBusy({ month, target });
    setError(null);
    try {
      const data = await downloadAttachment(driveFileId);
      const blobUrl = createAttachmentBlobUrl(data);
      setPreview((current) => {
        if (current?.blobUrl) URL.revokeObjectURL(current.blobUrl);
        return { ...data, blobUrl };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAttachmentBusy(null);
    }
  };

  const removeAttachment = (month: string, target: string) => {
    setState((s) => {
      const existing = findPayment(s.payments, month, target);
      if (!existing) return s;
      return {
        ...s,
        payments: s.payments.map((p) =>
          p.id === existing.id ? { ...p, attachment: undefined } : p,
        ),
      };
    });
  };

  if (!configured) {
    return (
      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6">
        <RentHeader
          title="Alquiler — Configuracion inicial"
          paymentDeadlineDay={state.paymentDeadlineDay}
        />
        <div className="mx-auto max-w-lg">
          <RentForm
            state={state}
            locked={locked}
            draftService={draftService}
            onDraftServiceChange={(patch) =>
              setDraftService((d) => ({ ...d, ...patch }))
            }
            onUpdateConfig={updateConfig}
            onAddService={addService}
            onRemoveService={removeService}
            showServices={false}
          />
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <input
        ref={fileRef}
        type="file"
        accept={ATTACHMENT_ACCEPT}
        className="hidden"
        onChange={onFileSelected}
      />

      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6">
        <RentHeader
          title="Contrato y actualizaciones"
          contractStart={state.contractStart}
          paymentDeadlineDay={state.paymentDeadlineDay}
        />
        <RentForm
          state={state}
          locked={locked}
          draftService={draftService}
          onDraftServiceChange={(patch) =>
            setDraftService((d) => ({ ...d, ...patch }))
          }
          onUpdateConfig={updateConfig}
          onAddService={addService}
          onRemoveService={removeService}
        />
      </section>

      {error && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-400">
          {error}
        </p>
      )}

      <RentGrid
        state={state}
        months={months}
        locked={locked}
        attachmentBusy={attachmentBusy}
        onUpdateMonthAmount={updateMonthAmount}
        onTogglePaid={togglePaid}
        onPickAttachment={pickAttachment}
        onViewAttachment={viewAttachment}
        onRemoveAttachment={removeAttachment}
      />

      {preview && (
        <AttachmentPreviewModal
          fileName={preview.fileName}
          mimeType={preview.mimeType}
          blobUrl={preview.blobUrl}
          onClose={closePreview}
        />
      )}
    </div>
  );
}
