import type { Wallet } from "../data/state";

const SPECIAL_TAGS = new Set(["ayer"]);

export type ParseFinanceSuccess =
  | {
      ok: true;
      kind: "entry";
      amount: number;
      type: "in" | "out";
      walletId: string;
      description: string;
      category?: string;
      date: string;
    }
  | {
      ok: true;
      kind: "transfer";
      amount: number;
      fromWalletId: string;
      toWalletId: string;
      description: string;
      date: string;
    };

export type ParseFinanceResult =
  | ParseFinanceSuccess
  | { ok: false; error: string };

function getTransactionDate(useYesterday: boolean): string {
  const d = new Date();
  if (useYesterday) d.setDate(d.getDate() - 1);
  return d.toISOString();
}

export function parseFinanceCommand(
  input: string,
  wallets: Wallet[],
): ParseFinanceResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: "Entrada vacía" };

  const walletByCmd = new Map(
    wallets.map((w) => [w.command.toLowerCase(), w] as const),
  );

  const tagMatches = [...trimmed.matchAll(/!(\S+)/g)];
  const tags = tagMatches.map((m) => m[1].toLowerCase());

  const hasYesterday = tags.includes("ayer");
  const date = getTransactionDate(hasYesterday);

  const walletTags = tags.filter((t) => walletByCmd.has(t));
  const categoryTags = tags.filter(
    (t) => !walletByCmd.has(t) && !SPECIAL_TAGS.has(t),
  );

  const isTransfer =
    trimmed.startsWith(">") || /^tr\b/i.test(trimmed);

  let amountMatch: RegExpMatchArray | null;
  if (isTransfer) {
    amountMatch =
      trimmed.match(/^>\s*(\d+(?:[.,]\d+)?)/) ??
      trimmed.match(/^tr\s+(\d+(?:[.,]\d+)?)/i);
  } else {
    amountMatch = trimmed.match(/([+-]?\d+(?:[.,]\d+)?)/);
  }

  if (!amountMatch) return { ok: false, error: "Sin monto detectado" };

  const amount = parseFloat(amountMatch[1].replace(",", "."));
  if (isNaN(amount) || amount === 0) return { ok: false, error: "Monto inválido" };

  const stripDescription = () => {
    let desc = trimmed;
    desc = desc.replace(amountMatch![0], "");
    if (isTransfer) {
      desc = desc.replace(/^>\s*/, "").replace(/^tr\s+/i, "");
    }
    desc = desc.replace(/!\S+/g, "").trim();
    return desc || "Sin descripción";
  };

  if (isTransfer) {
    if (walletTags.length !== 2) {
      return {
        ok: false,
        error:
          walletTags.length < 2
            ? "Transferencia: indicá origen y destino (ej: >5000 !ef !mp)"
            : "Transferencia: solo dos billeteras",
      };
    }
    const [fromCmd, toCmd] = walletTags;
    const fromWallet = walletByCmd.get(fromCmd)!;
    const toWallet = walletByCmd.get(toCmd)!;
    if (fromWallet.id === toWallet.id) {
      return { ok: false, error: "Origen y destino deben ser distintos" };
    }
    return {
      ok: true,
      kind: "transfer",
      amount: Math.abs(amount),
      fromWalletId: fromWallet.id,
      toWalletId: toWallet.id,
      description: stripDescription(),
      date,
    };
  }

  if (walletTags.length === 0) {
    const orphan = tags.find((t) => !SPECIAL_TAGS.has(t));
    if (orphan) {
      return { ok: false, error: `Comando !${orphan} no reconocido` };
    }
    return { ok: false, error: "Falta billetera (ej: !ef)" };
  }

  if (walletTags.length > 1) {
    return { ok: false, error: "Solo una billetera por ingreso o gasto" };
  }

  const wallet = walletByCmd.get(walletTags[0])!;
  const signedAmount = amountMatch[0].startsWith("-") || amount < 0;

  return {
    ok: true,
    kind: "entry",
    amount: Math.abs(amount),
    type: signedAmount ? "out" : "in",
    walletId: wallet.id,
    description: stripDescription(),
    category: categoryTags[0] ? categoryTags[0] : undefined,
    date,
  };
}
