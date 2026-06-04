import { useEffect, useId, useState } from "react";
import { X } from "lucide-react";
import type { IncreaseIndex } from "../../types/rent";
import {
  amountWithPercentageIncrease,
  deriveIncreasePercent,
  formatArs,
  INCREASE_INDEX_LABELS,
  monthLabel,
} from "../../lib/rentUtils";
import { sanitizePercentTyping } from "../../lib/inputUtils";

interface Props {
  month: string;
  label: string;
  index: IncreaseIndex;
  baseAmount: number;
  currentAmount: number;
  onApply: (newAmount: number) => void;
  onClose: () => void;
}

export default function RentIncreaseModal({
  month,
  label,
  index,
  baseAmount,
  currentAmount,
  onApply,
  onClose,
}: Props) {
  const [percent, setPercent] = useState(() =>
    deriveIncreasePercent(baseAmount, currentAmount),
  );
  const inputId = useId();
  const indexLabel = INCREASE_INDEX_LABELS[index];
  const parsed = Number(percent.replace(",", "."));
  const validPercent = Number.isFinite(parsed) && parsed >= 0;
  const newAmount = validPercent
    ? amountWithPercentageIncrease(baseAmount, parsed)
    : baseAmount;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = () => {
    if (!validPercent) return;
    onApply(newAmount);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      data-tauri-no-drag=""
      role="dialog"
      aria-modal="true"
      aria-labelledby={inputId}
    >
      <button
        type="button"
        data-tauri-no-drag=""
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
        onClick={onClose}
        aria-label="Cerrar"
      />

      <div className="relative w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#121216] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <header className="mb-4 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-neutral-200">
              Actualizar {label.toLowerCase()}
            </p>
            <p className="mt-0.5 text-xs capitalize text-neutral-500">
              {monthLabel(month)} · {indexLabel}
            </p>
          </div>
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

        <div className="space-y-4">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-neutral-600">
              Monto del mes anterior
            </p>
            <p className="mt-0.5 text-sm text-neutral-300">
              {formatArs(baseAmount)}
            </p>
          </div>

          <div>
            <label
              htmlFor={inputId}
              className="mb-1.5 block text-xs text-neutral-500"
            >
              Porcentaje de {indexLabel}
            </label>
            <div className="relative">
              <input
                id={inputId}
                data-tauri-no-drag=""
                type="text"
                inputMode="decimal"
                autoFocus
                value={percent}
                onChange={(e) => setPercent(sanitizePercentTyping(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
                placeholder="Ej. 5,2"
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] py-2 pl-3 pr-8 text-sm text-neutral-200 outline-none transition-colors focus:border-amber-500/40"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-600">
                %
              </span>
            </div>
          </div>

          {validPercent && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wide text-amber-600/80">
                Nuevo monto este mes
              </p>
              <p className="mt-0.5 text-sm font-medium text-amber-200/90">
                {formatArs(newAmount)}
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              data-tauri-no-drag=""
              onClick={onClose}
              className="flex-1 rounded-lg border border-white/[0.08] py-2 text-sm text-neutral-400 transition-colors hover:bg-white/[0.04]"
            >
              Cancelar
            </button>
            <button
              type="button"
              data-tauri-no-drag=""
              disabled={!validPercent}
              onClick={submit}
              className="flex-1 rounded-lg bg-amber-500/90 py-2 text-sm font-medium text-neutral-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Aplicar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
