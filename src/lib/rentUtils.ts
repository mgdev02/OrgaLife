import type {
  IncreaseIndex,
  RentPayment,
  RentState,
  RentService,
} from "../types/rent";
import { formatArs } from "./currencyUtils";

export { formatArs };

export const INCREASE_INDEX_LABELS: Record<IncreaseIndex, string> = {
  ipc: "IPC",
  icl: "ICL",
};

export const INCREASE_INTERVAL_OPTIONS: {
  months: number;
  label: string;
}[] = [
  { months: 2, label: "Bimestral (cada 2 meses)" },
  { months: 3, label: "Trimestral (cada 3 meses)" },
  { months: 4, label: "Cuatrimestral (cada 4 meses)" },
  { months: 6, label: "Semestral (cada 6 meses)" },
];

export function clampPaymentDeadlineDay(day: number): number {
  if (Number.isNaN(day)) return 10;
  return Math.min(10, Math.max(1, Math.round(day)));
}

export type PaymentStatus = "paid" | "pending" | "attention" | "overdue";

export const PAYMENT_STATUS_LABELS: Record<
  Exclude<PaymentStatus, "pending">,
  string
> = {
  paid: "Pagado",
  attention: "Atención",
  overdue: "Vencido",
};

/**
 * Compara la fecha actual con el periodo de pago del mes (día 1 → paymentDeadlineDay).
 * Atención / vencido solo aplica al mes calendario actual; otros meses quedan neutros.
 */
export function isRentMonthCurrent(month: string, now = new Date()): boolean {
  const [y, m] = month.split("-").map(Number);
  if ([y, m].some((n) => Number.isNaN(n))) return false;
  return now.getFullYear() === y && now.getMonth() + 1 === m;
}

export function getPaymentStatus(
  payment: RentPayment | undefined,
  state: RentState,
  month: string,
  now = new Date(),
): PaymentStatus {
  if (payment?.paidAt) return "paid";
  if (!isRentMonthCurrent(month, now)) return "pending";

  const deadlineDay = clampPaymentDeadlineDay(state.paymentDeadlineDay);
  const [y, m] = month.split("-").map(Number);
  if ([y, m].some((n) => Number.isNaN(n))) return "pending";

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(y, m - 1, 1);
  const deadline = new Date(y, m - 1, deadlineDay);

  if (today > deadline) return "overdue";
  if (today >= monthStart && today <= deadline) return "attention";
  return "pending";
}

export function paymentStatusRowClass(status: PaymentStatus): string {
  switch (status) {
    case "paid":
      return "border-emerald-500/25 bg-emerald-500/[0.05]";
    case "attention":
      return "border-amber-500/25 bg-amber-500/[0.06]";
    case "overdue":
      return "border-red-500/20 bg-red-500/[0.04]";
    default:
      return "border-white/[0.04] bg-white/[0.02]";
  }
}

export function monthsSinceContract(
  contractStart: string,
  monthKey: string,
): number {
  const [cy, cm] = contractStart.split("-").map(Number);
  const [y, m] = monthKey.split("-").map(Number);
  if ([cy, cm, y, m].some((n) => Number.isNaN(n))) return -1;
  return (y - cy) * 12 + (m - cm);
}

/** Mes en el que corresponde revisar / aplicar actualización IPC o ICL. */
export function isIncreaseMonth(
  intervalMonths: number,
  contractStart: string,
  monthKey: string,
): boolean {
  if (intervalMonths < 1) return false;
  const offset = monthsSinceContract(contractStart, monthKey);
  return offset > 0 && offset % intervalMonths === 0;
}

export function clampContractDurationYears(years: number): number {
  if (Number.isNaN(years) || years < 1) return 2;
  return Math.min(10, Math.round(years));
}

export function listRentMonths(
  contractStart: string,
  contractDurationYears = 2,
): string[] {
  const parts = contractStart.split("-").map(Number);
  if (parts.length < 2 || parts.some((n) => Number.isNaN(n))) return [];

  const [y, m] = parts;
  const years = clampContractDurationYears(contractDurationYears);
  const cursor = new Date(y, m - 1, 1);
  const contractEnd = new Date(y, m - 1 + years * 12 - 1, 1);

  const months: string[] = [];
  const walk = new Date(cursor);
  while (walk <= contractEnd) {
    const key = `${walk.getFullYear()}-${String(walk.getMonth() + 1).padStart(2, "0")}`;
    months.push(key);
    walk.setMonth(walk.getMonth() + 1);
  }
  return months;
}

export function currentMonthKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Separa la grilla en mes actual, anteriores y futuros respecto al calendario. */
export function splitRentMonthsByCurrent(
  months: string[],
  now = new Date(),
): {
  previous: string[];
  current: string | null;
  future: string[];
} {
  if (months.length === 0) {
    return { previous: [], current: null, future: [] };
  }

  const key = currentMonthKey(now);
  const currentIdx = months.indexOf(key);

  if (currentIdx >= 0) {
    return {
      previous: months.slice(0, currentIdx),
      current: months[currentIdx],
      future: months.slice(currentIdx + 1),
    };
  }

  const firstFutureIdx = months.findIndex((m) => m > key);
  if (firstFutureIdx === -1) {
    return {
      previous: months.slice(0, -1),
      current: months[months.length - 1],
      future: [],
    };
  }

  if (firstFutureIdx === 0) {
    return {
      previous: [],
      current: months[0],
      future: months.slice(1),
    };
  }

  return {
    previous: months.slice(0, firstFutureIdx),
    current: months[firstFutureIdx],
    future: months.slice(firstFutureIdx + 1),
  };
}

export function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
}

export interface RentLineItem {
  target: string;
  label: string;
  amount: number;
  /** Si este mes conviene actualizar el monto según el índice. */
  increaseHint?: string;
  increaseIndex?: IncreaseIndex;
}

export function getMonthAmount(
  state: RentState,
  month: string,
  target: string,
  defaultAmount: number,
): number {
  const override = state.monthAmounts[month]?.[target];
  return override !== undefined ? override : defaultAmount;
}

function resolveDefaultRent(state: RentState, month: string): number {
  const months = listRentMonths(
    state.contractStart,
    state.contractDurationYears,
  );
  const idx = months.indexOf(month);
  if (idx <= 0) return state.monthlyRent;
  const prev = months[idx - 1];
  return getMonthAmount(state, prev, "rent", state.monthlyRent);
}

function resolveDefaultService(
  state: RentState,
  month: string,
  service: RentService,
): number {
  const months = listRentMonths(
    state.contractStart,
    state.contractDurationYears,
  );
  const idx = months.indexOf(month);
  if (idx <= 0) return service.referenceAmount;
  const prev = months[idx - 1];
  return getMonthAmount(state, prev, service.id, service.referenceAmount);
}

export function buildLineItemsForMonth(
  state: RentState,
  month: string,
): RentLineItem[] {
  const items: RentLineItem[] = [];

  const rentIncrease = isIncreaseMonth(
    state.rentIncreaseMonths,
    state.contractStart,
    month,
  );
  const rentAlreadyUpdated = state.monthAmounts[month]?.rent !== undefined;
  const indexLabel = INCREASE_INDEX_LABELS[state.rentIncreaseIndex];
  items.push({
    target: "rent",
    label: "Alquiler",
    amount: getMonthAmount(
      state,
      month,
      "rent",
      resolveDefaultRent(state, month),
    ),
    increaseHint: rentIncrease
      ? rentAlreadyUpdated
        ? `Ajustar según ${indexLabel}`
        : `Actualizar según ${indexLabel}`
      : undefined,
    increaseIndex: rentIncrease ? state.rentIncreaseIndex : undefined,
  });

  if (state.withExpenses) {
    items.push({
      target: "expenses",
      label: "Expensas",
      amount: getMonthAmount(state, month, "expenses", 0),
    });
  }

  for (const s of state.services) {
    items.push({
      target: s.id,
      label: s.name,
      amount: getMonthAmount(
        state,
        month,
        s.id,
        resolveDefaultService(state, month, s),
      ),
    });
  }

  return items;
}

export function getPreviousMonthAmount(
  state: RentState,
  month: string,
  target: string,
): number {
  const months = listRentMonths(
    state.contractStart,
    state.contractDurationYears,
  );
  const idx = months.indexOf(month);
  if (idx <= 0) {
    if (target === "rent") return state.monthlyRent;
    if (target === "expenses") return 0;
    const service = state.services.find((s) => s.id === target);
    return service?.referenceAmount ?? 0;
  }
  const prevMonth = months[idx - 1];
  const prevItems = buildLineItemsForMonth(state, prevMonth);
  return prevItems.find((i) => i.target === target)?.amount ?? 0;
}

export function amountWithPercentageIncrease(
  base: number,
  percent: number,
): number {
  if (!Number.isFinite(percent) || percent < 0) return base;
  return Math.round(base * (1 + percent / 100));
}

/** Porcentaje implícito entre monto base y monto actual (para reabrir el modal). */
export function deriveIncreasePercent(
  base: number,
  current: number,
): string {
  if (base <= 0 || current <= base) return "";
  const pct = ((current / base) - 1) * 100;
  if (!Number.isFinite(pct) || pct <= 0) return "";
  const rounded = Math.round(pct * 100) / 100;
  const text = rounded % 1 === 0 ? String(rounded) : rounded.toFixed(2);
  return text.replace(".", ",");
}

export function setMonthAmount(
  state: RentState,
  month: string,
  target: string,
  amount: number,
): RentState {
  return {
    ...state,
    monthAmounts: {
      ...state.monthAmounts,
      [month]: {
        ...(state.monthAmounts[month] ?? {}),
        [target]: amount,
      },
    },
  };
}

export function migrateRentState(raw: RentState): RentState {
  const legacyBillingToMonths = (b?: string): number => {
    if (b === "bimonthly") return 2;
    if (b === "quarterly") return 3;
    if (b === "monthly") return 1;
    return 6;
  };

  const rawAny = raw as RentState & {
    rentBilling?: string;
    expensesBilling?: string;
    services?: Array<{
      id: string;
      name: string;
      amount?: number;
      monthlyAmount?: number;
      referenceAmount?: number;
      billing?: string;
    }>;
  };

  const services: RentService[] = (rawAny.services ?? []).map(
    (s: {
      id: string;
      name: string;
      amount?: number;
      monthlyAmount?: number;
      referenceAmount?: number;
    }) => ({
      id: s.id,
      name: s.name,
      referenceAmount:
        s.referenceAmount ?? s.amount ?? s.monthlyAmount ?? 0,
    }),
  );

  return {
    contractStart: raw.contractStart ?? "",
    monthlyRent: raw.monthlyRent ?? 0,
    rentIncreaseIndex: raw.rentIncreaseIndex ?? "icl",
    rentIncreaseMonths:
      raw.rentIncreaseMonths ??
      legacyBillingToMonths(rawAny.rentBilling) ??
      6,
    contractDurationYears: clampContractDurationYears(
      raw.contractDurationYears ?? 2,
    ),
    withExpenses: raw.withExpenses ?? false,
    expensesAmount: raw.expensesAmount ?? 0,
    expensesIncreaseIndex:
      raw.expensesIncreaseIndex ??
      (raw.withExpenses ? "icl" : null),
    expensesIncreaseMonths:
      raw.expensesIncreaseMonths ??
      legacyBillingToMonths(rawAny.expensesBilling) ??
      6,
    paymentDeadlineDay: clampPaymentDeadlineDay(
      raw.paymentDeadlineDay ?? 10,
    ),
    services,
    monthAmounts: raw.monthAmounts ?? {},
    payments: raw.payments ?? [],
  };
}

export function findPayment(
  payments: RentPayment[],
  month: string,
  target: string,
): RentPayment | undefined {
  return payments.find((p) => p.month === month && p.target === target);
}

export function upsertPayment(
  payments: RentPayment[],
  month: string,
  target: string,
  patch: Partial<RentPayment>,
): RentPayment[] {
  const existing = findPayment(payments, month, target);
  if (existing) {
    return payments.map((p) =>
      p.id === existing.id ? { ...p, ...patch } : p,
    );
  }
  const created: RentPayment = {
    id: crypto.randomUUID(),
    month,
    target,
    paidAt: null,
    ...patch,
  };
  return [...payments, created];
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("no se pudo leer el archivo"));
        return;
      }
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("lectura fallida"));
    reader.readAsDataURL(file);
  });
}
