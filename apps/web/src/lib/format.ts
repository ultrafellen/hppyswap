// SPDX-License-Identifier: MIT
// Amount validator shared by parseAmount and AmountInput's keystroke filter.
const AMOUNT_RE = /^\d*(\.\d*)?$/;

/**
 * Formats a raw bigint token amount (base units) as a grouped, trimmed
 * decimal string: `en-US` thousands separators on the whole part, at most
 * `maxDp` fractional digits with trailing zeros stripped (so `formatAmount`
 * never pads — "3,842.113", never "3,842.1130").
 */
export function formatAmount(value: bigint, decimals: number, maxDp = 6): string {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  const fraction = abs % base;

  const fractionStr = fraction
    .toString()
    .padStart(decimals, "0")
    .slice(0, maxDp)
    .replace(/0+$/, "");

  const wholeFormatted = new Intl.NumberFormat("en-US").format(whole);
  const body = fractionStr.length > 0 ? `${wholeFormatted}.${fractionStr}` : wholeFormatted;
  return negative && (whole > 0n || fractionStr.length > 0) ? `-${body}` : body;
}

/**
 * Formats a raw bigint token amount as a plain (no thousands grouping),
 * full-precision decimal string — safe to feed straight back into
 * `parseAmount` (e.g. the "max" balance button), unlike `formatAmount`'s
 * grouped/trimmed display string.
 */
export function toPlainAmount(value: bigint, decimals: number): string {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  const fraction = abs % base;

  const fractionStr = fraction.toString().padStart(decimals, "0").replace(/0+$/, "");
  const body = fractionStr.length > 0 ? `${whole}.${fractionStr}` : `${whole}`;
  return negative && (whole > 0n || fractionStr.length > 0) ? `-${body}` : body;
}

/**
 * Parses user-typed decimal text into a raw bigint amount, or `null` when
 * the text isn't a valid non-negative decimal number (including empty
 * string). Fractional digits beyond `decimals` are truncated rather than
 * rejected.
 */
export function parseAmount(text: string, decimals: number): bigint | null {
  if (text === "" || !AMOUNT_RE.test(text)) return null;

  const [wholeRaw, fracRaw = ""] = text.split(".");
  const whole = wholeRaw === "" ? "0" : wholeRaw;
  const fraction = fracRaw.slice(0, decimals).padEnd(decimals, "0");

  try {
    return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction === "" ? "0" : fraction);
  } catch {
    return null;
  }
}
