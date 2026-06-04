/** Formato argentino: miles con `.`, decimales con `,`, símbolo `$`. */

function parseDotGrouped(s: string): number | null {
  if (!s.includes(".")) {
    if (!/^\d+$/.test(s)) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  const parts = s.split(".");
  if (parts.some((p) => p === "")) return null;

  for (let i = 1; i < parts.length; i++) {
    if (parts[i].length !== 3) {
      if (i === parts.length - 1 && parts[i].length < 3) {
        const complete = parts.slice(0, i);
        if (complete.length === 1) {
          const n = Number(complete[0]);
          return Number.isFinite(n) ? n : null;
        }
        if (complete.slice(1).every((p) => p.length === 3)) {
          const n = Number(complete.join(""));
          return Number.isFinite(n) ? n : null;
        }
      }
      return null;
    }
  }

  const n = Number(parts.join(""));
  return Number.isFinite(n) ? n : null;
}

/**
 * Interpreta lo que el usuario escribe en un campo de monto ARS.
 * - `550.000` → 550000
 * - `550,000` → 550000 (miles)
 * - `555,23` → 555.23 (2 decimales = coma decimal)
 * - `555,230` → 555230 (3+ dígitos tras la coma = miles)
 */
export function parseArsInput(raw: string): number | null {
  let s = raw.trim().replace(/^\$+\s*/, "").replace(/\s/g, "");
  if (!s || s === "-") return null;

  const negative = s.startsWith("-");
  if (negative) s = s.slice(1);

  if (!/^[\d.,]+$/.test(s)) return null;

  const commaIdx = s.lastIndexOf(",");

  if (commaIdx >= 0) {
    const after = s.slice(commaIdx + 1);
    const before = s.slice(0, commaIdx);

    if (after.length === 0) {
      const n = parseDotGrouped(before);
      return n === null ? null : negative ? -n : n;
    }

    if (after.length === 1 || after.length === 2) {
      const intPart = before.replace(/\./g, "");
      if (!/^\d*$/.test(intPart) || !/^\d+$/.test(after)) return null;
      const n = Number(`${intPart}.${after}`);
      return Number.isFinite(n) ? (negative ? -n : n) : null;
    }

    const digits = before.replace(/\./g, "") + after;
    if (!/^\d+$/.test(digits)) return null;
    const n = Number(digits);
    return Number.isFinite(n) ? (negative ? -n : n) : null;
  }

  const n = parseDotGrouped(s);
  return n === null ? null : negative ? -n : n;
}

export function formatArsAmount(
  amount: number,
  opts?: { withSymbol?: boolean; forceDecimals?: boolean },
): string {
  const withSymbol = opts?.withSymbol !== false;
  const hasDecimals =
    opts?.forceDecimals === true
      ? true
      : opts?.forceDecimals === false
        ? false
        : !Number.isInteger(amount);

  const formatted = Math.abs(amount).toLocaleString("es-AR", {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  });

  const signed = amount < 0 ? "-" : "";
  const body = withSymbol ? `$ ${formatted}` : formatted;
  return `${signed}${body}`;
}

/** Alias corto para montos en solo lectura. */
export function formatArs(n: number): string {
  return formatArsAmount(n);
}
