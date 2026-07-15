// SPDX-License-Identifier: MIT
import { applySlippage, quote } from "@hppyswap/sdk";

/**
 * Ratio-locked second amount for an existing pool: given how much of one
 * side the user just typed, how much of the other side the router will
 * pull to keep the pool's current price. Returns `null` when there's no
 * ratio to lock to yet (a brand-new/empty pool — both reserves 0) or the
 * typed amount isn't a usable positive number, so callers can fall back to
 * free-input mode instead of throwing.
 */
export function deriveSecondAmount(amountIn: bigint | null, reserveIn: bigint, reserveOut: bigint): bigint | null {
  if (amountIn == null || amountIn <= 0n) return null;
  if (reserveIn <= 0n || reserveOut <= 0n) return null;
  return quote(amountIn, reserveIn, reserveOut);
}

/**
 * amountAMin/amountBMin for `addLiquidity`/`addLiquidityETH`. An existing
 * pool has a price to protect, so both desired amounts get the usual
 * slippage haircut. A brand-new pool has no ratio yet — the first
 * depositor sets the price, so there's nothing to protect and both mins
 * are 0 (any amount goes as the desired amount).
 */
export function computeAddAmountsMin(
  amountADesired: bigint,
  amountBDesired: bigint,
  isExistingPool: boolean,
  slippageBps: number,
): { amountAMin: bigint; amountBMin: bigint } {
  if (!isExistingPool) return { amountAMin: 0n, amountBMin: 0n };
  return {
    amountAMin: applySlippage(amountADesired, slippageBps),
    amountBMin: applySlippage(amountBDesired, slippageBps),
  };
}

/**
 * amountAMin/amountBMin for `removeLiquidity`/`removeLiquidityETH`: the
 * burned LP's share of each reserve (mirroring UniswapV2Pair.burn's
 * `amount = liquidity * balance / totalSupply`), then the usual slippage
 * haircut. Zero liquidity or an unset (zero) total supply has no share to
 * take, so both mins are 0 rather than dividing by zero.
 */
export function computeRemoveAmountsMin(
  liquidity: bigint,
  totalSupply: bigint,
  reserveA: bigint,
  reserveB: bigint,
  slippageBps: number,
): { amountAMin: bigint; amountBMin: bigint } {
  if (totalSupply <= 0n || liquidity <= 0n) return { amountAMin: 0n, amountBMin: 0n };
  const shareA = (liquidity * reserveA) / totalSupply;
  const shareB = (liquidity * reserveB) / totalSupply;
  return {
    amountAMin: applySlippage(shareA, slippageBps),
    amountBMin: applySlippage(shareB, slippageBps),
  };
}

/**
 * LP amount for one of the remove-liquidity percent presets (25/50/75/100).
 * 100% always returns the literal balance rather than `balance * 100n /
 * 100n`, so a balance that doesn't divide evenly by 100 still lets the user
 * withdraw every last unit instead of leaving dust behind.
 */
export function lpAmountForPercent(balance: bigint, percent: number): bigint {
  if (balance <= 0n || percent <= 0) return 0n;
  if (percent >= 100) return balance;
  return (balance * BigInt(Math.round(percent))) / 100n;
}

/**
 * The caller's percent share of total LP supply, as a plain number (e.g.
 * `25` for a quarter of the pool) suitable for `.toFixed(n)` display.
 * Computed via bigint math scaled to basis points first so the division
 * stays exact for realistic (18-decimal-ish) token amounts rather than
 * losing precision converting huge bigints to Number up front.
 */
export function computeSharePercent(lpBalance: bigint, totalSupply: bigint): number {
  if (totalSupply <= 0n || lpBalance <= 0n) return 0;
  const bps = (lpBalance * 1_000_000n) / totalSupply; // 1_000_000 bps == 100.0000%
  return Number(bps) / 10_000;
}
