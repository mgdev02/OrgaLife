import { Plus, Trash2 } from "lucide-react";
import type { IncreaseIndex, RentService, RentState } from "../../types/rent";
import CurrencyInput from "../CurrencyInput";
import IntegerInput from "../IntegerInput";
import {
  INCREASE_INDEX_LABELS,
  INCREASE_INTERVAL_OPTIONS,
  clampAgencyCommissionPercent,
  clampPaymentDeadlineDay,
  clampContractDurationYears,
  formatArs,
  formatPercentDisplay,
} from "../../lib/rentUtils";
import { sanitizeLabelTyping, sanitizePercentTyping } from "../../lib/inputUtils";

const RENT_FIELD =
  "h-10 w-full rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 text-sm text-neutral-300 outline-none transition-colors focus:border-white/[0.12] disabled:opacity-50";

function IncreaseIndexSelect({
  value,
  onChange,
  disabled,
  allowNone,
}: {
  value: IncreaseIndex | null;
  onChange: (v: IncreaseIndex | null) => void;
  disabled?: boolean;
  allowNone?: boolean;
}) {
  return (
    <select
      data-tauri-no-drag=""
      value={value ?? ""}
      disabled={disabled}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === "" ? null : (v as IncreaseIndex));
      }}
      className={RENT_FIELD}
    >
      {allowNone && <option value="">Sin actualización</option>}
      {(Object.keys(INCREASE_INDEX_LABELS) as IncreaseIndex[]).map((k) => (
        <option key={k} value={k}>
          {INCREASE_INDEX_LABELS[k]}
        </option>
      ))}
    </select>
  );
}

function IntervalSelect({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (months: number) => void;
  disabled?: boolean;
}) {
  return (
    <select
      data-tauri-no-drag=""
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      className={RENT_FIELD}
    >
      {INCREASE_INTERVAL_OPTIONS.map((opt) => (
        <option key={opt.months} value={opt.months}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

interface Props {
  state: RentState;
  locked: boolean;
  draftService: { name: string; amount: number };
  onDraftServiceChange: (patch: Partial<{ name: string; amount: number }>) => void;
  onUpdateConfig: (patch: Partial<RentState>) => void;
  onAddService: () => void;
  onRemoveService: (id: string) => void;
  showServices?: boolean;
}

export default function RentForm({
  state,
  locked,
  draftService,
  onDraftServiceChange,
  onUpdateConfig,
  onAddService,
  onRemoveService,
  showServices = true,
}: Props) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="mb-1.5 block text-xs text-neutral-500">
            Inicio de alquiler
          </span>
          <input
            data-tauri-no-drag=""
            type="date"
            value={state.contractStart}
            onChange={(e) => onUpdateConfig({ contractStart: e.target.value })}
            disabled={locked}
            className={`${RENT_FIELD} bg-white/[0.03] text-neutral-200`}
          />
        </label>

        <label className="block">
          <span className="mb-1 text-[10px] uppercase tracking-wider text-neutral-600">
            Día límite de pago
          </span>
          <IntegerInput
            data-tauri-no-drag=""
            value={state.paymentDeadlineDay}
            onChange={(paymentDeadlineDay) =>
              onUpdateConfig({
                paymentDeadlineDay: clampPaymentDeadlineDay(paymentDeadlineDay),
              })
            }
            min={1}
            max={10}
            maxDigits={2}
            disabled={locked}
            className={RENT_FIELD}
          />
          <span className="mt-1 block text-[10px] text-neutral-600">
            Del 1 al {clampPaymentDeadlineDay(state.paymentDeadlineDay)}
          </span>
        </label>

        <label className="block">
          <span className="mb-1 text-[10px] uppercase tracking-wider text-neutral-600">
            Alquiler inicial (ARS)
          </span>
          <CurrencyInput
            data-tauri-no-drag=""
            value={state.monthlyRent}
            onChange={(monthlyRent) => onUpdateConfig({ monthlyRent })}
            disabled={locked}
            emptyWhenZero
            className={RENT_FIELD}
          />
        </label>

        <div className="block">
          <span className="mb-1 text-[10px] uppercase tracking-wider text-neutral-600">
            Comisión inmobiliaria
          </span>
          <label className="mb-2 flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3">
            <input
              data-tauri-no-drag=""
              type="checkbox"
              checked={state.withAgencyCommission}
              onChange={(e) =>
                onUpdateConfig({ withAgencyCommission: e.target.checked })
              }
              disabled={locked}
              className="rounded border-white/20"
            />
            <span className="text-sm text-neutral-400">Aplica comisión</span>
          </label>
          {state.withAgencyCommission && (
            <div className="relative">
              <input
                data-tauri-no-drag=""
                type="text"
                inputMode="decimal"
                value={formatPercentDisplay(state.agencyCommissionPercent)}
                onChange={(e) => {
                  const raw = sanitizePercentTyping(e.target.value);
                  if (raw === "") {
                    onUpdateConfig({ agencyCommissionPercent: 0 });
                    return;
                  }
                  const n = Number(raw.replace(",", "."));
                  if (Number.isFinite(n)) {
                    onUpdateConfig({
                      agencyCommissionPercent: clampAgencyCommissionPercent(n),
                    });
                  }
                }}
                disabled={locked}
                placeholder="5"
                className={`${RENT_FIELD} pr-8`}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-600">
                %
              </span>
            </div>
          )}
          {state.withAgencyCommission && (
            <span className="mt-1 block text-[10px] leading-snug text-neutral-600">
              Se suma al total de cada mes sobre el alquiler vigente.
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 text-[10px] uppercase tracking-wider text-neutral-600">
            Actualización del alquiler
          </span>
          <IncreaseIndexSelect
            value={state.rentIncreaseIndex}
            onChange={(rentIncreaseIndex) =>
              rentIncreaseIndex && onUpdateConfig({ rentIncreaseIndex })
            }
            disabled={locked}
          />
        </label>
        <label className="block">
          <span className="mb-1 text-[10px] uppercase tracking-wider text-neutral-600">
            Cada cuánto se actualiza
          </span>
          <IntervalSelect
            value={state.rentIncreaseMonths}
            onChange={(rentIncreaseMonths) =>
              onUpdateConfig({ rentIncreaseMonths })
            }
            disabled={locked}
          />
        </label>
        <label className="block">
          <span className="mb-1 text-[10px] uppercase tracking-wider text-neutral-600">
            Duración del contrato (años)
          </span>
          <IntegerInput
            data-tauri-no-drag=""
            value={state.contractDurationYears}
            onChange={(contractDurationYears) =>
              onUpdateConfig({
                contractDurationYears: clampContractDurationYears(
                  contractDurationYears,
                ),
              })
            }
            min={1}
            max={10}
            maxDigits={2}
            disabled={locked}
            className={RENT_FIELD}
          />
        </label>

        <label className="flex items-center gap-2 sm:col-span-3">
          <input
            data-tauri-no-drag=""
            type="checkbox"
            checked={state.withExpenses}
            onChange={(e) =>
              onUpdateConfig({ withExpenses: e.target.checked })
            }
            disabled={locked}
            className="rounded border-white/20"
          />
          <span className="text-sm text-neutral-400">
            Incluye expensas (monto distinto cada mes, en la grilla)
          </span>
        </label>

        <p className="text-xs leading-relaxed text-neutral-600 sm:col-span-3">
          La app no calcula IPC/ICL: en los meses de actualización del alquiler te
          avisa para cargar el nuevo monto. Expensas y servicios se editan mes a
          mes en la grilla.
        </p>
      </div>

      {showServices && (
        <section className="mt-6 border-t border-white/[0.06] pt-6">
          <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-neutral-500">
            Servicios (monto por mes)
          </h3>
          <p className="mb-4 text-xs text-neutral-600">
            Luz, gas, internet, etc. Aparecen todos los meses; el monto se define en
            cada mes de la grilla.
          </p>

          <ul className="mb-4 space-y-2">
            {state.services.map((s: RentService) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2"
              >
                <span className="text-sm text-neutral-300">{s.name}</span>
                <span className="text-xs text-neutral-500">
                  Ref. {formatArs(s.referenceAmount)}
                </span>
                {!locked && (
                  <button
                    type="button"
                    data-tauri-no-drag=""
                    onClick={() => onRemoveService(s.id)}
                    className="text-neutral-600 transition-colors hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>

          {!locked && (
            <div className="flex flex-wrap gap-2">
              <input
                data-tauri-no-drag=""
                type="text"
                placeholder="Nombre del servicio"
                value={draftService.name}
                onChange={(e) =>
                  onDraftServiceChange({
                    name: sanitizeLabelTyping(e.target.value),
                  })
                }
                className="min-w-[140px] flex-1 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-sm text-neutral-300 outline-none transition-colors focus:border-white/[0.12]"
              />
              <CurrencyInput
                data-tauri-no-drag=""
                value={draftService.amount}
                onChange={(amount) => onDraftServiceChange({ amount })}
                emptyWhenZero
                placeholder="Monto ref."
                className="w-36 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-sm text-neutral-300 outline-none transition-colors focus:border-white/[0.12]"
              />
              <button
                type="button"
                data-tauri-no-drag=""
                onClick={onAddService}
                className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.05] px-3 py-1.5 text-xs text-neutral-400 transition-colors hover:bg-white/[0.08] hover:text-neutral-300"
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar
              </button>
            </div>
          )}
        </section>
      )}
    </>
  );
}
