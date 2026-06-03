export interface WeeklyBlock {
  label: string;
  hours: number;
  color: string;
  description: string;
}

export interface SubTask {
  id: string;
  label: string;
  done: boolean;
}

export interface StudyItem {
  id: string;
  title: string;
  done: boolean;
  subtasks?: SubTask[];
}

export interface StudySection {
  id: string;
  title: string;
  items: StudyItem[];
}

export interface CambridgeGoal {
  id: string;
  label: string;
  current: number;
  target: number;
  unit: string;
}

export interface InboxItem {
  id: string;
  text: string;
  priority: "high" | "medium" | "low";
  done: boolean;
}

export const WEEKLY_BLOCKS: WeeklyBlock[] = [
  {
    label: "Trabajo",
    hours: 40,
    color: "#6366f1",
    description: "Software Engineer — Full-time",
  },
  {
    label: "Análisis",
    hours: 12,
    color: "#f59e0b",
    description: "UBA Presencial + Particular",
  },
  {
    label: "IPC",
    hours: 6,
    color: "#10b981",
    description: "UBA XXI — Flexible",
  },
  {
    label: "Inglés",
    hours: 4,
    color: "#ec4899",
    description: "Cambridge Institute",
  },
];

const ANALISIS_SUBTASK_LABELS = [
  "Ejercicios de Base / Nivelación",
  "Práctica de Parciales (Altillo/Asimov)",
  "Revisión con Profesor Particular",
] as const;

function buildAnalisisItem(
  id: string,
  title: string,
  allDone: boolean,
): StudyItem {
  return {
    id,
    title,
    done: allDone,
    subtasks: ANALISIS_SUBTASK_LABELS.map((label, i) => ({
      id: `${id}_s${i}`,
      label,
      done: allDone,
    })),
  };
}

export const INITIAL_UBA_SECTIONS: StudySection[] = [
  {
    id: "analisis",
    title: "Análisis Matemático",
    items: [
      buildAnalisisItem("a1", "Guía 1 — Números reales y desigualdades", true),
      buildAnalisisItem("a2", "Guía 2 — Funciones y gráficos", true),
      buildAnalisisItem("a3", "Guía 3 — Límites", false),
      buildAnalisisItem("a4", "Guía 4 — Continuidad", false),
      buildAnalisisItem("a5", "Guía 5 — Derivadas", false),
      buildAnalisisItem("a6", "Guía 6 — Aplicaciones de derivadas", false),
      buildAnalisisItem("a7", "Guía 7 — Integrales", false),
      buildAnalisisItem("a8", "Guía 8 — Técnicas de integración", false),
    ],
  },
  {
    id: "ipc",
    title: "Intro al Pensamiento Científico",
    items: [
      { id: "i1", title: "Unidad 1 — Ciencia y conocimiento", done: true },
      { id: "i2", title: "Unidad 2 — Observación y teoría", done: false },
      { id: "i3", title: "Unidad 3 — Explicación científica", done: false },
      { id: "i4", title: "Unidad 4 — Cambio científico", done: false },
    ],
  },
];

export const INITIAL_CAMBRIDGE_GOALS: CambridgeGoal[] = [
  { id: "c1", label: "Vocab técnico dominado", current: 120, target: 300, unit: "palabras" },
  { id: "c2", label: "Speaking practice", current: 14, target: 40, unit: "sesiones" },
  { id: "c3", label: "Writing assignments", current: 5, target: 16, unit: "entregas" },
  { id: "c4", label: "Mock exams completados", current: 1, target: 4, unit: "exámenes" },
];

export interface Wallet {
  id: string;
  name: string;
  balance: number;
  command: string;
}

export interface Transaction {
  id: string;
  type: "in" | "out" | "transfer";
  amount: number;
  walletId: string;
  fromWalletId?: string;
  toWalletId?: string;
  category?: string;
  description: string;
  date: string;
}

export const INITIAL_WALLETS: Wallet[] = [
  { id: "wal_1", name: "Efectivo", balance: 0, command: "ef" },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [];

export const INITIAL_INBOX: InboxItem[] = [
  { id: "w1", text: "Revisar PR de migración de auth", priority: "high", done: false },
  { id: "w2", text: "Documentar endpoints API v3", priority: "medium", done: false },
  { id: "w3", text: "Refactor módulo de caching", priority: "low", done: false },
];
