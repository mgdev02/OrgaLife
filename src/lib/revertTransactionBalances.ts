import type { Transaction, Wallet } from "../data/state";

/** Revierte el impacto de una transacción sobre los saldos de billeteras. */
export function revertTransactionBalances(
  wallets: Wallet[],
  txn: Transaction,
): Wallet[] {
  return wallets.map((w) => {
    if (txn.type === "transfer") {
      if (w.id === txn.fromWalletId) {
        return { ...w, balance: w.balance + txn.amount };
      }
      if (w.id === txn.toWalletId) {
        return { ...w, balance: w.balance - txn.amount };
      }
      return w;
    }

    if (w.id !== txn.walletId) return w;

    if (txn.type === "in") {
      return { ...w, balance: w.balance - txn.amount };
    }
    if (txn.type === "out") {
      return { ...w, balance: w.balance + txn.amount };
    }

    return w;
  });
}
