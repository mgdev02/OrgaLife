import { useEffect, useState } from "react";
import { formatArsAmount, parseArsInput } from "../lib/currencyUtils";
import { sanitizeArsTyping } from "../lib/inputUtils";

interface Props {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  /** Si es true, muestra vacío cuando el valor es 0 y el campo no tiene foco. */
  emptyWhenZero?: boolean;
  allowNegative?: boolean;
  "data-tauri-no-drag"?: string;
}

export default function CurrencyInput({
  value,
  onChange,
  disabled,
  className = "",
  placeholder,
  emptyWhenZero = false,
  allowNegative = false,
  "data-tauri-no-drag": noDrag,
}: Props) {
  const [text, setText] = useState(() => formatDisplay(value, emptyWhenZero));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setText(formatDisplay(value, emptyWhenZero));
    }
  }, [value, focused, emptyWhenZero]);

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-600">
        $
      </span>
      <input
        type="text"
        inputMode="decimal"
        data-tauri-no-drag={noDrag}
        value={text}
        disabled={disabled}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onChange={(e) => {
          const raw = sanitizeArsTyping(e.target.value, allowNegative);
          setText(raw);
          const parsed = parseArsInput(raw);
          if (parsed !== null) onChange(parsed);
        }}
        onBlur={() => {
          setFocused(false);
          const parsed = parseArsInput(text);
          const next = parsed ?? value;
          onChange(next);
          setText(formatDisplay(next, emptyWhenZero));
        }}
        className={`${className} pl-7`.trim()}
      />
    </div>
  );
}

function formatDisplay(value: number, emptyWhenZero: boolean): string {
  if (emptyWhenZero && value === 0) return "";
  const abs = Math.abs(value);
  const body = formatArsAmount(abs, { withSymbol: false });
  return value < 0 ? `-${body}` : body;
}
