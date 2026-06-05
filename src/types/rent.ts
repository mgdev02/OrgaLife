/** Índice contractual de actualización del alquiler (Argentina). */
export type IncreaseIndex = "ipc" | "icl";

export interface RentService {
  id: string;
  name: string;
  /** Monto de referencia; el monto de cada mes se edita en la grilla. */
  referenceAmount: number;
}

export interface RentAttachment {
  driveFileId: string;
  fileName: string;
  mimeType: string;
}

export interface RentPayment {
  id: string;
  month: string;
  target: string;
  paidAt: string | null;
  attachment?: RentAttachment;
}

export interface RentState {
  contractStart: string;
  /** Alquiler vigente al inicio (se actualiza mes a mes en la grilla). */
  monthlyRent: number;
  /** Si aplica comisión de inmobiliaria sobre el alquiler de cada mes. */
  withAgencyCommission: boolean;
  /** Porcentaje de comisión (ej. 5 = 5 %). */
  agencyCommissionPercent: number;
  rentIncreaseIndex: IncreaseIndex;
  /** Cada cuántos meses aplica una actualización IPC/ICL (desde inicio de contrato). */
  rentIncreaseMonths: number;
  /** Duración total del contrato en años. */
  contractDurationYears: number;
  withExpenses: boolean;
  expensesAmount: number;
  expensesIncreaseIndex: IncreaseIndex | null;
  expensesIncreaseMonths: number;
  /** Día del mes (1–10) hasta el cual corresponde pagar. */
  paymentDeadlineDay: number;
  services: RentService[];
  monthAmounts: Record<string, Record<string, number>>;
  payments: RentPayment[];
}

export const INITIAL_RENT_STATE: RentState = {
  contractStart: "",
  monthlyRent: 0,
  withAgencyCommission: false,
  agencyCommissionPercent: 5,
  rentIncreaseIndex: "icl",
  rentIncreaseMonths: 6,
  contractDurationYears: 2,
  withExpenses: false,
  expensesAmount: 0,
  expensesIncreaseIndex: null,
  expensesIncreaseMonths: 6,
  paymentDeadlineDay: 10,
  services: [],
  monthAmounts: {},
  payments: [],
};
