// SPDX-License-Identifier: MIT
// Same permissive shape as lib/format.ts's parseAmount validator, but allows
// a trailing "." mid-typing (e.g. "1.") since that's a valid intermediate
// keystroke even though parseAmount would treat it as "1.0".
const TYPING_RE = /^\d*\.?\d*$/;

export type AmountInputProps = {
  value: string;
  onChange?: (text: string) => void;
  decimals: number;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  dataAgent?: string;
};

/**
 * Free-text decimal amount field. Filters keystrokes to plausible decimal
 * text (digits + at most one dot, fractional part capped at `decimals`)
 * rather than trying to fully validate on every keystroke — final
 * validation/parsing is the caller's job via lib/format.ts's parseAmount.
 */
export function AmountInput({
  value,
  onChange,
  decimals,
  disabled,
  readOnly,
  placeholder = "0.0",
  dataAgent,
}: AmountInputProps) {
  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      spellCheck={false}
      className="amount-input"
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
      data-agent={dataAgent}
      onChange={(e) => {
        const next = e.target.value;
        if (next === "") { onChange?.(next); return; }
        if (!TYPING_RE.test(next)) return;
        const dotIndex = next.indexOf(".");
        if (dotIndex !== -1 && next.length - dotIndex - 1 > decimals) return;
        onChange?.(next);
      }}
    />
  );
}
