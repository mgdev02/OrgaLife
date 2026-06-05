import { useMemo, useState } from "react";
import CurrencyInput from "../CurrencyInput";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  Loader2,
  Paperclip,
  Trash2,
  TrendingUp,
} from "lucide-react";
import type { IncreaseIndex, RentState } from "../../types/rent";
import {
  buildLineItemsForMonth,
  findPayment,
  formatArs,
  getPaymentStatus,
  getPreviousMonthAmount,
  isRentMonthCurrent,
  monthLabel,
  PAYMENT_STATUS_LABELS,
  paymentStatusRowClass,
  splitRentMonthsByCurrent,
  type PaymentStatus,
} from "../../lib/rentUtils";
import { ATTACHMENT_FORMATS_HINT } from "../../lib/driveAttachmentsAPI";
import RentIncreaseModal from "./RentIncreaseModal";

type PendingUpload = { month: string; target: string };

type IncreaseModalState = {
  month: string;
  target: string;
  label: string;
  index: IncreaseIndex;
  baseAmount: number;
  currentAmount: number;
};

interface Props {
  state: RentState;
  months: string[];
  locked: boolean;
  attachmentBusy: PendingUpload | null;
  onUpdateMonthAmount: (month: string, target: string, value: number) => void;
  onTogglePaid: (month: string, target: string) => void;
  onPickAttachment: (month: string, target: string) => void;
  onViewAttachment: (
    month: string,
    target: string,
    driveFileId: string,
  ) => void;
  onRemoveAttachment: (month: string, target: string) => void;
}

function StatusBadge({ status }: { status: PaymentStatus }) {
  if (status === "pending") return null;

  const styles: Record<Exclude<PaymentStatus, "pending">, string> = {
    paid: "bg-emerald-500/20 text-emerald-400 ring-emerald-500/30",
    attention: "bg-amber-500/20 text-amber-400 ring-amber-500/25",
    overdue: "bg-red-500/15 text-red-400 ring-red-500/25",
  };

  return (
    <span
      className={`inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-2 text-[10px] font-semibold uppercase tracking-wide ring-1 ${styles[status]}`}
      title={PAYMENT_STATUS_LABELS[status]}
    >
      {status === "paid" ? (
        <Check className="h-3 w-3" aria-hidden />
      ) : (
        PAYMENT_STATUS_LABELS[status]
      )}
    </span>
  );
}

function AttachmentChip({
  fileName,
  locked,
  loading,
  onView,
  onRemove,
}: {
  fileName: string;
  locked: boolean;
  loading: boolean;
  onView: () => void;
  onRemove: () => void;
}) {
  if (loading) {
    return (
      <div
        data-tauri-no-drag=""
        className="flex items-center rounded-md border border-white/[0.06] p-1.5 text-neutral-500"
        aria-busy="true"
        title="Cargando comprobante"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      </div>
    );
  }

  return (
    <div
      data-tauri-no-drag=""
      className="flex max-w-full items-center gap-0.5 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] py-0.5 pl-1 pr-0.5"
    >
      <button
        type="button"
        data-tauri-no-drag=""
        onClick={onView}
        className="flex min-w-0 max-w-[160px] items-center gap-1 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-emerald-500/10"
        title="Vista previa del comprobante"
      >
        <FileText className="h-3 w-3 shrink-0 text-emerald-500/80" />
        <span className="truncate text-[10px] text-emerald-300/90">
          {fileName}
        </span>
        <Eye className="h-3 w-3 shrink-0 text-emerald-400/70" />
      </button>
      {!locked && (
        <button
          type="button"
          data-tauri-no-drag=""
          onClick={onRemove}
          className="rounded-md p-1 text-neutral-600 transition-colors hover:bg-red-500/10 hover:text-red-400"
          title="Quitar comprobante"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

export default function RentGrid({
  state,
  months,
  locked,
  attachmentBusy,
  onUpdateMonthAmount,
  onTogglePaid,
  onPickAttachment,
  onViewAttachment,
  onRemoveAttachment,
}: Props) {
  const [increaseModal, setIncreaseModal] = useState<IncreaseModalState | null>(
    null,
  );
  const [showPrevious, setShowPrevious] = useState(false);

  const { previous, current, future } = useMemo(
    () => splitRentMonthsByCurrent(months),
    [months],
  );

  const renderMonthCard = (month: string, highlightCurrent = false) => {
    const lineItems = buildLineItemsForMonth(state, month);
    const monthTotal = lineItems.reduce((a, li) => a + li.amount, 0);
    const isCurrent =
      highlightCurrent || isRentMonthCurrent(month);

    return (
      <section
        key={month}
        className={`rounded-2xl border p-5 ${
          isCurrent
            ? "border-amber-500/20 bg-amber-500/[0.04]"
            : "border-white/[0.06] bg-white/[0.03]"
        }`}
      >
        <div className="mb-4 flex items-baseline justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="text-sm font-medium capitalize text-neutral-200">
              {monthLabel(month)}
            </h3>
            {isCurrent && (
              <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-400/90">
                Este mes
              </span>
            )}
          </div>
          <span className="text-xs text-neutral-600">
            Total {formatArs(monthTotal)}
          </span>
        </div>

        <div className="space-y-2">
          {lineItems.map((li) => {
            const payment = findPayment(state.payments, month, li.target);
            const status = getPaymentStatus(payment, state, month);
            const attachmentLoading =
              attachmentBusy?.month === month &&
              attachmentBusy?.target === li.target;
            const rowClass = paymentStatusRowClass(status);
            const showIncrease = li.increaseIndex && status !== "paid";

            return (
              <div
                key={`${month}-${li.target}`}
                className={`flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2.5 transition-colors ${rowClass}`}
              >
                <StatusBadge status={status} />

                <div className="min-w-0 flex-1">
                  <p className="text-sm text-neutral-300">{li.label}</p>
                  {showIncrease &&
                    (locked ? (
                      <p className="mt-0.5 flex items-center gap-1 text-[10px] text-amber-500/90">
                        <TrendingUp className="h-3 w-3 shrink-0" />
                        {li.increaseHint}
                      </p>
                    ) : (
                      <button
                        type="button"
                        data-tauri-no-drag=""
                        onClick={() =>
                          setIncreaseModal({
                            month,
                            target: li.target,
                            label: li.label,
                            index: li.increaseIndex!,
                            baseAmount: getPreviousMonthAmount(
                              state,
                              month,
                              li.target,
                            ),
                            currentAmount: li.amount,
                          })
                        }
                        className="mt-0.5 flex items-center gap-1 rounded-md text-[10px] text-amber-500/90 transition-colors hover:bg-amber-500/10 hover:text-amber-400"
                        title="Aplicar actualización por índice"
                      >
                        <TrendingUp className="h-3 w-3 shrink-0" />
                        {li.increaseHint}
                      </button>
                    ))}
                  {status === "paid" && payment?.paidAt && (
                    <p className="mt-0.5 text-xs text-emerald-600/80">
                      Pagado {payment.paidAt}
                    </p>
                  )}
                </div>

                {!locked && !li.autoCalculated ? (
                  <CurrencyInput
                    data-tauri-no-drag=""
                    value={li.amount}
                    onChange={(value) =>
                      onUpdateMonthAmount(month, li.target, value)
                    }
                    emptyWhenZero
                    className="w-32 rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-right text-sm text-neutral-300 outline-none transition-colors focus:border-white/[0.14]"
                  />
                ) : (
                  <span
                    className={`text-sm ${li.autoCalculated ? "text-neutral-500" : "text-neutral-400"}`}
                    title={
                      li.autoCalculated
                        ? "Calculado automáticamente según el alquiler del mes"
                        : undefined
                    }
                  >
                    {formatArs(li.amount)}
                  </span>
                )}

                {!locked && (
                  <button
                    type="button"
                    data-tauri-no-drag=""
                    onClick={() => onTogglePaid(month, li.target)}
                    className={`flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium uppercase transition-colors ${
                      status === "paid"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15"
                        : "border-white/[0.06] text-neutral-600 hover:bg-white/[0.04] hover:text-neutral-400"
                    }`}
                  >
                    <Check className="h-3 w-3" />
                    {status === "paid" ? "Pagado" : "Marcar"}
                  </button>
                )}

                {!locked && !payment?.attachment && (
                  <button
                    type="button"
                    data-tauri-no-drag=""
                    disabled={attachmentLoading}
                    onClick={() => onPickAttachment(month, li.target)}
                    className="rounded-md border border-white/[0.06] p-1.5 text-neutral-600 transition-colors hover:border-white/[0.1] hover:bg-white/[0.04] disabled:opacity-50"
                    title={
                      attachmentLoading
                        ? "Subiendo comprobante"
                        : ATTACHMENT_FORMATS_HINT
                    }
                    aria-busy={attachmentLoading}
                  >
                    {attachmentLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Paperclip className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}

                {payment?.attachment && (
                  <AttachmentChip
                    fileName={payment.attachment.fileName}
                    locked={locked}
                    loading={attachmentLoading}
                    onView={() =>
                      onViewAttachment(
                        month,
                        li.target,
                        payment.attachment!.driveFileId,
                      )
                    }
                    onRemove={() => onRemoveAttachment(month, li.target)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  return (
    <>
      <div className="space-y-4">
        {previous.length > 0 && (
          <div className="space-y-3">
            <button
              type="button"
              data-tauri-no-drag=""
              onClick={() => setShowPrevious((v) => !v)}
              className="flex w-full items-center justify-center gap-1.5 py-1 text-xs text-neutral-600 transition-colors hover:text-neutral-400"
              aria-expanded={showPrevious}
            >
              {showPrevious ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" />
                  Ocultar meses anteriores
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" />
                  Mostrar meses anteriores ({previous.length})
                </>
              )}
            </button>

            {showPrevious && (
              <div className="space-y-4">
                {previous.map((month) => renderMonthCard(month))}
              </div>
            )}
          </div>
        )}

        {current && renderMonthCard(current, true)}

        {future.map((month) => renderMonthCard(month))}
      </div>

      {increaseModal && (
        <RentIncreaseModal
          month={increaseModal.month}
          label={increaseModal.label}
          index={increaseModal.index}
          baseAmount={increaseModal.baseAmount}
          currentAmount={increaseModal.currentAmount}
          onApply={(newAmount) =>
            onUpdateMonthAmount(
              increaseModal.month,
              increaseModal.target,
              newAmount,
            )
          }
          onClose={() => setIncreaseModal(null)}
        />
      )}
    </>
  );
}
