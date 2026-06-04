import { useEffect, useMemo, useState } from "react";
import {
  WalletCards,
  Plus,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  AlertCircle,
  Settings,
  HelpCircle,
  X,
} from "lucide-react";
import type { Wallet, Transaction } from "../data/state";
import { INITIAL_WALLETS, INITIAL_TRANSACTIONS } from "../data/state";
import usePersistedState from "../hooks/usePersistedState";
import { parseFinanceCommand } from "../lib/parseFinanceCommand";
import { revertTransactionBalances } from "../lib/revertTransactionBalances";
import { whenLocked } from "../lib/whenLocked";
import CurrencyInput from "./CurrencyInput";
import { formatArs } from "../lib/currencyUtils";
import {
  sanitizeFinanceCommandTyping,
  sanitizeLabelTyping,
  sanitizeWalletCommandTyping,
} from "../lib/inputUtils";

interface Props {
  locked?: boolean;
}

type HistoryFilter = "all" | "in" | "out" | "transfer";

function txnInvolvesWallet(t: Transaction, walletId: string): boolean {
  return (
    t.walletId === walletId ||
    t.fromWalletId === walletId ||
    t.toWalletId === walletId
  );
}

function HelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-labelledby="finance-help-title"
        className="no-drag relative w-full max-w-md rounded-2xl border border-white/[0.08] bg-neutral-950 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="no-drag absolute right-4 top-4 rounded-md p-1 text-neutral-600 transition-colors hover:bg-white/[0.06] hover:text-neutral-400"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>

        <h3
          id="finance-help-title"
          className="mb-1 text-sm font-medium tracking-wide text-neutral-300 uppercase"
        >
          Consola de comandos
        </h3>
        <p className="mb-5 text-xs text-neutral-600">
          Escribí un comando y presioná Enter. Los tags pueden ir en cualquier orden.
        </p>

        <div className="space-y-4 text-sm">
          <section>
            <p className="mb-1.5 text-xs font-medium tracking-wide text-emerald-500/80 uppercase">
              Ingresos
            </p>
            <code className="block rounded-lg bg-white/[0.04] px-3 py-2 font-mono text-xs text-neutral-400">
              +12000 !ef Sueldo
            </code>
            <p className="mt-1 text-[11px] text-neutral-600">
              El signo + (o sin signo) suma a la billetera indicada.
            </p>
          </section>

          <section>
            <p className="mb-1.5 text-xs font-medium tracking-wide text-red-400/80 uppercase">
              Gastos
            </p>
            <code className="block rounded-lg bg-white/[0.04] px-3 py-2 font-mono text-xs text-neutral-400">
              -1500 !mp !comida Hamburguesa
            </code>
            <p className="mt-1 text-[11px] text-neutral-600">
              !comida es categoría libre; !mp es la billetera.
            </p>
          </section>

          <section>
            <p className="mb-1.5 text-xs font-medium tracking-wide text-violet-400/80 uppercase">
              Transferencias
            </p>
            <code className="block rounded-lg bg-white/[0.04] px-3 py-2 font-mono text-xs text-neutral-400">
              {">5000 !ef !mp"}
            </code>
            <code className="mt-1.5 block rounded-lg bg-white/[0.04] px-3 py-2 font-mono text-xs text-neutral-400">
              tr 5000 !ef !mp
            </code>
            <p className="mt-1 text-[11px] text-neutral-600">
              Mueve fondos entre billeteras sin cambiar el total neto.
            </p>
          </section>

          <section>
            <p className="mb-1.5 text-xs font-medium tracking-wide text-amber-400/80 uppercase">
              Fecha y categorías
            </p>
            <code className="block rounded-lg bg-white/[0.04] px-3 py-2 font-mono text-xs text-neutral-400">
              -800 !ef !ayer Café
            </code>
            <p className="mt-1 text-[11px] text-neutral-600">
              !ayer registra el movimiento con la fecha de ayer. Cualquier otro !tag que no sea billetera se guarda como categoría.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

const FILTER_OPTIONS: { id: HistoryFilter; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "in", label: "Ingresos" },
  { id: "out", label: "Gastos" },
  { id: "transfer", label: "Transferencias" },
];

export default function FinancePanel({ locked = false }: Props) {
  const [wallets, setWallets] = usePersistedState<Wallet[]>(
    "finance_wallets",
    INITIAL_WALLETS,
  );
  const [transactions, setTransactions] = usePersistedState<Transaction[]>(
    "finance_txns",
    INITIAL_TRANSACTIONS,
  );
  const [draft, setDraft] = useState("");
  const [showConfig, setShowConfig] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
  const [walletFilter, setWalletFilter] = useState<string | null>(null);

  const parseResult = useMemo(
    () => (draft.trim() ? parseFinanceCommand(draft, wallets) : null),
    [draft, wallets],
  );

  const inputError =
    draft.trim().length > 0 && parseResult !== null && !parseResult.ok
      ? parseResult.error
      : "";

  const canSubmit =
    draft.trim().length > 0 &&
    parseResult !== null &&
    parseResult.ok;

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (historyFilter !== "all" && t.type !== historyFilter) return false;
      if (walletFilter && !txnInvolvesWallet(t, walletFilter)) return false;
      return true;
    });
  }, [transactions, historyFilter, walletFilter]);

  const addWallet = () => {
    setWallets((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: "Nueva billetera",
        balance: 0,
        command: "cmd",
      },
    ]);
  };

  const updateWallet = (id: string, patch: Partial<Wallet>) => {
    setWallets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, ...patch } : w)),
    );
  };

  const removeWallet = (id: string) => {
    setWallets((prev) => prev.filter((w) => w.id !== id));
    setTransactions((prev) =>
      prev.filter(
        (t) =>
          t.walletId !== id &&
          t.fromWalletId !== id &&
          t.toWalletId !== id,
      ),
    );
    if (walletFilter === id) setWalletFilter(null);
  };

  const submit = () => {
    if (!canSubmit || !parseResult?.ok) return;

    if (parseResult.kind === "transfer") {
      const txn: Transaction = {
        id: crypto.randomUUID(),
        type: "transfer",
        amount: parseResult.amount,
        walletId: parseResult.fromWalletId,
        fromWalletId: parseResult.fromWalletId,
        toWalletId: parseResult.toWalletId,
        description: parseResult.description,
        date: parseResult.date,
      };
      setTransactions((prev) => [txn, ...prev]);
      setWallets((prev) =>
        prev.map((w) => {
          if (w.id === parseResult.fromWalletId) {
            return { ...w, balance: w.balance - parseResult.amount };
          }
          if (w.id === parseResult.toWalletId) {
            return { ...w, balance: w.balance + parseResult.amount };
          }
          return w;
        }),
      );
    } else {
      const txn: Transaction = {
        id: crypto.randomUUID(),
        type: parseResult.type,
        amount: parseResult.amount,
        walletId: parseResult.walletId,
        category: parseResult.category,
        description: parseResult.description,
        date: parseResult.date,
      };
      setTransactions((prev) => [txn, ...prev]);
      setWallets((prev) =>
        prev.map((w) =>
          w.id === parseResult.walletId
            ? {
                ...w,
                balance:
                  w.balance +
                  (parseResult.type === "in"
                    ? parseResult.amount
                    : -parseResult.amount),
              }
            : w,
        ),
      );
    }

    setDraft("");
  };

  const walletName = (id: string) =>
    wallets.find((w) => w.id === id)?.name ?? "—";

  const toggleWalletFilter = (id: string) => {
    setWalletFilter((prev) => (prev === id ? null : id));
  };

  const deleteTransaction = (id: string) => {
    const txn = transactions.find((t) => t.id === id);
    if (!txn) return;

    setTransactions((prev) => prev.filter((t) => t.id !== id));
    setWallets((prev) => revertTransactionBalances(prev, txn));
  };

  return (
    <section className="space-y-5">
      <HelpModal open={showHelp} onClose={() => setShowHelp(false)} />

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6">
        <div className="mb-5 flex items-center gap-2.5">
          <WalletCards className="h-4 w-4 text-neutral-500" />
          <h2 className="text-sm font-medium tracking-wide text-neutral-400 uppercase">
            Billeteras
          </h2>
          {!locked && (
            <button
              type="button"
              onClick={() => setShowConfig((v) => !v)}
              className={`no-drag cursor-pointer ml-auto rounded-md p-1 transition-colors ${
                showConfig
                  ? "bg-white/[0.08] text-neutral-300"
                  : "text-neutral-600 hover:bg-white/[0.06] hover:text-neutral-400"
              }`}
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {wallets.map((w) => {
            const isFiltered = walletFilter === w.id;
            return (
              <div
                key={w.id}
                className={`rounded-xl border px-4 py-3 transition-colors ${
                  isFiltered
                    ? "border-violet-500/30 bg-violet-500/[0.06]"
                    : "border-white/[0.06] bg-white/[0.02]"
                }`}
              >
                <p className={`text-xs text-neutral-500 ${whenLocked(locked)}`}>
                  {w.name}
                </p>
                <p
                  className={`mt-1 font-mono text-lg font-semibold tracking-tight ${whenLocked(locked)} ${
                    w.balance >= 0
                      ? "text-emerald-400/90"
                      : "text-red-400/90"
                  }`}
                >
                  {formatArs(w.balance)}
                </p>
                <button
                  type="button"
                  onClick={() => toggleWalletFilter(w.id)}
                  className={`no-drag cursor-pointer mt-0.5 font-mono text-[10px] transition-colors ${
                    isFiltered
                      ? "text-violet-400"
                      : "text-neutral-700 hover:text-neutral-500"
                  }`}
                  title={
                    isFiltered
                      ? "Quitar filtro de historial"
                      : "Filtrar historial por esta billetera"
                  }
                >
                  !{w.command}
                </button>
              </div>
            );
          })}
        </div>

        {!locked && (
          <div
            className="grid transition-[grid-template-rows] duration-200"
            style={{ gridTemplateRows: showConfig ? "1fr" : "0fr" }}
          >
            <div className="overflow-hidden">
              <div className="mt-5 space-y-2 border-t border-white/[0.06] pt-5">
                {wallets.map((w) => (
                  <div key={w.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={w.name}
                      onChange={(e) =>
                        updateWallet(w.id, {
                          name: sanitizeLabelTyping(e.target.value),
                        })
                      }
                      className="no-drag flex-1 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-sm text-neutral-300 outline-none transition-colors focus:border-white/[0.12]"
                    />
                    <div className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2 py-1">
                      <span className="text-xs text-neutral-600">!</span>
                      <input
                        type="text"
                        value={w.command}
                        onChange={(e) =>
                          updateWallet(w.id, {
                            command: sanitizeWalletCommandTyping(e.target.value),
                          })
                        }
                        className="no-drag w-12 bg-transparent font-mono text-xs text-neutral-400 outline-none"
                      />
                    </div>
                    <CurrencyInput
                      allowNegative
                      value={w.balance}
                      onChange={(balance) => updateWallet(w.id, { balance })}
                      className="no-drag w-36 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-right font-mono text-sm text-neutral-300 outline-none transition-colors focus:border-white/[0.12]"
                    />
                    <button
                      type="button"
                      onClick={() => removeWallet(w.id)}
                      className="no-drag rounded p-1 text-neutral-700 transition-colors hover:bg-white/[0.06] hover:text-red-400"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addWallet}
                  className="no-drag flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/[0.08] py-1.5 text-xs text-neutral-600 transition-colors hover:border-white/[0.15] hover:text-neutral-400"
                >
                  <Plus className="h-3 w-3" />
                  Agregar billetera
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6">
        <div className="mb-4 flex items-center gap-2.5">
          <ArrowDownLeft className="h-4 w-4 text-neutral-500" />
          <h2 className="text-sm font-medium tracking-wide text-neutral-400 uppercase">
            Movimientos
          </h2>
          <span
            className={`ml-auto font-mono text-xs text-neutral-700 ${whenLocked(locked)}`}
          >
            {filteredTransactions.length}
            {filteredTransactions.length !== transactions.length &&
              ` / ${transactions.length}`}{" "}
            registros
          </span>
        </div>

        <div className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) =>
                setDraft(sanitizeFinanceCommandTyping(e.target.value))
              }
              onKeyDown={(e) => e.key === "Enter" && canSubmit && submit()}
              placeholder="+12000 !ef Sueldo · -4500 !ga !alquiler · >5000 !ef !mp"
              className={`no-drag cursor-text flex-1 rounded-lg border bg-white/[0.03] px-3 py-2 font-mono text-sm text-neutral-300 placeholder:text-neutral-700 outline-none transition-colors focus:border-white/[0.12] ${
                inputError
                  ? "border-red-500/50"
                  : "border-white/[0.06]"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowHelp(true)}
              className="no-drag cursor-pointer rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-2 text-neutral-600 transition-colors hover:bg-white/[0.06] hover:text-neutral-400"
              title="Ayuda de comandos"
              aria-label="Ayuda de comandos"
            >
              <HelpCircle className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className="no-drag cursor-pointer rounded-lg border border-white/[0.06] bg-white/[0.05] px-3 py-2 text-neutral-500 transition-colors hover:bg-white/[0.08] hover:text-neutral-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          {inputError && (
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-red-400/80">
              <AlertCircle className="h-3 w-3" />
              {inputError}
            </div>
          )}
        </div>

        {transactions.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {FILTER_OPTIONS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setHistoryFilter(id)}
                className={`no-drag cursor-pointer rounded-md px-2.5 py-1 text-[11px] font-medium tracking-wide transition-colors ${
                  historyFilter === id
                    ? "bg-white/[0.1] text-neutral-300"
                    : "bg-white/[0.02] text-neutral-600 hover:bg-white/[0.05] hover:text-neutral-500"
                }`}
              >
                {label}
              </button>
            ))}
            {walletFilter && (
              <button
                type="button"
                onClick={() => setWalletFilter(null)}
                className={`no-drag cursor-pointer rounded-md border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[11px] text-violet-400/90 transition-colors hover:bg-violet-500/15 ${whenLocked(locked)}`}
              >
                {walletName(walletFilter)} ×
              </button>
            )}
          </div>
        )}

        {transactions.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-700 italic">
            Sin movimientos registrados.
          </p>
        ) : filteredTransactions.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-700 italic">
            Ningún movimiento coincide con los filtros activos.
          </p>
        ) : (
          <ul className="max-h-80 space-y-0.5 overflow-y-auto">
            {filteredTransactions.map((t) => (
              <li
                key={t.id}
                className="group flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.04]"
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                    t.type === "in"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : t.type === "out"
                        ? "bg-red-500/15 text-red-400"
                        : "bg-violet-500/15 text-violet-400"
                  }`}
                >
                  {t.type === "in" ? (
                    <ArrowDownLeft className="h-2.5 w-2.5" />
                  ) : t.type === "out" ? (
                    <ArrowUpRight className="h-2.5 w-2.5" />
                  ) : (
                    <ArrowLeftRight className="h-2.5 w-2.5" />
                  )}
                </span>

                <div className={`min-w-0 flex-1 ${whenLocked(locked)}`}>
                  <p
                    className={`truncate text-sm text-neutral-300 ${whenLocked(locked)}`}
                  >
                    {t.description}
                  </p>
                  <p
                    className={`text-[10px] text-neutral-600 ${whenLocked(locked)}`}
                  >
                    {t.type === "transfer" ? (
                      <>
                        {walletName(t.fromWalletId!)} →{" "}
                        {walletName(t.toWalletId!)}
                      </>
                    ) : (
                      <>
                        {walletName(t.walletId)}
                        {t.category && (
                          <span className="text-neutral-700">
                            {" "}
                            · !{t.category}
                          </span>
                        )}
                      </>
                    )}
                    {" · "}
                    {new Date(t.date).toLocaleDateString("es-AR", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                <span
                  className={`shrink-0 font-mono text-sm font-medium ${whenLocked(locked)} ${
                    t.type === "in"
                      ? "text-emerald-400/90"
                      : t.type === "out"
                        ? "text-red-400/90"
                        : "text-violet-400/90"
                  }`}
                >
                  {t.type === "transfer"
                    ? formatArs(t.amount)
                    : `${t.type === "in" ? "+" : "−"}${formatArs(t.amount)}`}
                </span>

                {!locked && (
                  <button
                    type="button"
                    onClick={() => deleteTransaction(t.id)}
                    className="no-drag shrink-0 rounded p-1 text-neutral-700 opacity-0 transition-all group-hover:opacity-100 hover:bg-white/[0.06] hover:text-red-400"
                    aria-label="Eliminar movimiento"
                    title="Eliminar movimiento"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
