// SPDX-License-Identifier: MIT
const ONE_E18 = 10n ** 18n;
const CENT_E18 = ONE_E18 / 100n; // 1e16 — smallest displayed unit ($0.01)
const MILLION_E18 = 1_000_000n * ONE_E18;

/**
 * Converts a raw token amount (base units, `decimals`) into a USD value, at
 * `priceE18` (USD per one whole token, 1e18 fixed-point — see
 * `@hppyswap/sdk`'s `midPriceE18`), itself 1e18 fixed-point. Pure bigint
 * math; only `formatUsd` turns a value into display text.
 */
export function usdValueE18(amount: bigint, decimals: number, priceE18: bigint): bigint {
  return (amount * priceE18) / 10n ** BigInt(decimals);
}

/**
 * Renders a 1e18 fixed-point USD value as display text:
 *  - `null` (no amount typed, or no price route found) -> "" — nothing to
 *    show, distinct from a real $0.
 *  - exactly 0 -> "$0"
 *  - positive but under a cent -> "<$0.01" (no misleading "$0.00")
 *  - under $1,000,000 -> "$1,234.56" (2dp, en-US thousands grouping)
 *  - $1,000,000 and over -> "$1.23M" (2dp, abbreviated)
 *
 * Floors (truncates) rather than rounds at the last shown digit — the
 * upstream reserve-ratio math already carries far more precision than 2dp,
 * so there's no meaningfully "more correct" rounding choice either way.
 */
export function formatUsd(valueE18: bigint | null): string {
  if (valueE18 == null) return "";
  if (valueE18 === 0n) return "$0";
  if (valueE18 < CENT_E18) return "<$0.01";

  if (valueE18 >= MILLION_E18) {
    const hundredthsOfMillion = (valueE18 * 100n) / MILLION_E18;
    const whole = hundredthsOfMillion / 100n;
    const frac = hundredthsOfMillion % 100n;
    return `$${whole}.${frac.toString().padStart(2, "0")}M`;
  }

  const cents = valueE18 / CENT_E18;
  const dollars = cents / 100n;
  const centsPart = cents % 100n;
  const dollarsFormatted = new Intl.NumberFormat("en-US").format(dollars);
  return `$${dollarsFormatted}.${centsPart.toString().padStart(2, "0")}`;
}

/**
 * A pool's TVL: both reserves' USD value, summed. `null` (rather than
 * summing just the side that resolved) whenever either side's price is
 * unknown — a partial sum would understate TVL in a way that looks like a
 * real number instead of "can't tell yet". Shared by the pools list's
 * `pool-tvl` column and the pool detail page's `pool-tvl`/
 * `liq-position-value` header lines so the two can't drift apart.
 */
export function poolTvlE18(
  reserve0: bigint,
  decimals0: number,
  price0: bigint | null,
  reserve1: bigint,
  decimals1: number,
  price1: bigint | null,
): bigint | null {
  if (price0 == null || price1 == null) return null;
  return usdValueE18(reserve0, decimals0, price0) + usdValueE18(reserve1, decimals1, price1);
}

/**
 * `formatUsd` prefixed with `~` for the swap page's "approximate value of
 * what you're about to trade" lines — except when the value is already
 * `<$0.01`, where a leading `~` would double up two different "this isn't
 * exact" markers into the confusing `~<$0.01`. `null` still renders as ""
 * (nothing to prefix).
 */
export function formatUsdApprox(valueE18: bigint | null): string {
  if (valueE18 == null) return "";
  const formatted = formatUsd(valueE18);
  return formatted.startsWith("<") ? formatted : `~${formatted}`;
}
