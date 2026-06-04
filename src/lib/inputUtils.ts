/** Filtra lo que el usuario puede tipear según el tipo de campo. */

export function sanitizeArsTyping(raw: string, allowNegative = false): string {
  let s = raw.replace(/[^\d.,\s-]/g, "");
  if (!allowNegative) {
    return s.replace(/-/g, "");
  }
  const negative = s.trimStart().startsWith("-");
  s = s.replace(/-/g, "");
  return negative ? `-${s}` : s;
}

export function sanitizeIntegerTyping(raw: string, maxDigits = 4): string {
  return raw.replace(/\D/g, "").slice(0, maxDigits);
}

/** Porcentaje: dígitos y un separador decimal (, o .). */
export function sanitizePercentTyping(raw: string): string {
  let s = raw.replace(/[^\d.,]/g, "");
  const sep = s.search(/[.,]/);
  if (sep >= 0) {
    s = s.slice(0, sep + 1) + s.slice(sep + 1).replace(/[.,]/g, "");
  }
  return s;
}

/** Nombres visibles: letras, números, espacios y signos habituales. */
export function sanitizeLabelTyping(raw: string): string {
  return raw.replace(/[^\p{L}\p{N}\s.,'()/\-&]/gu, "");
}

/** Comando corto de billetera (!ef, !mp…). */
export function sanitizeWalletCommandTyping(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 16);
}

/** Consola de movimientos: montos, tags, texto libre. */
export function sanitizeFinanceCommandTyping(raw: string): string {
  return raw.replace(/[^\d+\->!.,\p{L}\p{N}\s]/gu, "");
}

export function parseIntegerInput(raw: string): number | null {
  const digits = sanitizeIntegerTyping(raw);
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}
