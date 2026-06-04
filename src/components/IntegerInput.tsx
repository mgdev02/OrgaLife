import { sanitizeIntegerTyping } from "../lib/inputUtils";

interface Props {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  maxDigits?: number;
  disabled?: boolean;
  className?: string;
  "data-tauri-no-drag"?: string;
}

export default function IntegerInput({
  value,
  onChange,
  min = 0,
  max = 9999,
  maxDigits = 4,
  disabled,
  className,
  "data-tauri-no-drag": noDrag,
}: Props) {
  return (
    <input
      type="text"
      inputMode="numeric"
      data-tauri-no-drag={noDrag}
      value={String(value)}
      disabled={disabled}
      onChange={(e) => {
        const digits = sanitizeIntegerTyping(e.target.value, maxDigits);
        if (!digits) return;
        const n = Math.min(max, Math.max(min, Number(digits)));
        onChange(n);
      }}
      onBlur={() => {
        onChange(Math.min(max, Math.max(min, value)));
      }}
      className={className}
    />
  );
}
