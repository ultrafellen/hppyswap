// SPDX-License-Identifier: MIT
const FEE_NUM = 997n, FEE_DEN = 1000n;

export function getAmountOut(amountIn: bigint, reserveIn: bigint, reserveOut: bigint): bigint {
  if (amountIn <= 0n) throw new Error("INSUFFICIENT_INPUT_AMOUNT");
  if (reserveIn <= 0n || reserveOut <= 0n) throw new Error("INSUFFICIENT_LIQUIDITY");
  const amountInWithFee = amountIn * FEE_NUM;
  return (amountInWithFee * reserveOut) / (reserveIn * FEE_DEN + amountInWithFee);
}
export function getAmountIn(amountOut: bigint, reserveIn: bigint, reserveOut: bigint): bigint {
  if (amountOut <= 0n) throw new Error("INSUFFICIENT_OUTPUT_AMOUNT");
  if (reserveIn <= 0n || reserveOut <= 0n) throw new Error("INSUFFICIENT_LIQUIDITY");
  return (reserveIn * amountOut * FEE_DEN) / ((reserveOut - amountOut) * FEE_NUM) + 1n;
}
export function quote(amountA: bigint, reserveA: bigint, reserveB: bigint): bigint {
  if (amountA <= 0n) throw new Error("INSUFFICIENT_AMOUNT");
  if (reserveA <= 0n || reserveB <= 0n) throw new Error("INSUFFICIENT_LIQUIDITY");
  return (amountA * reserveB) / reserveA;
}
export function applySlippage(amount: bigint, slippageBps: number): bigint {
  return (amount * BigInt(10000 - slippageBps)) / 10000n;
}
export function priceImpactBps(amountIn: bigint, reserveIn: bigint, reserveOut: bigint): number {
  const midOut = (amountIn * reserveOut) / reserveIn; // no-fee spot output
  const actual = getAmountOut(amountIn, reserveIn, reserveOut);
  if (midOut === 0n) return 0;
  return Number(((midOut - actual) * 10000n) / midOut);
}
/**
 * Combines per-hop price impact (bps) across a multi-hop route into one
 * overall figure: `10000 * (1 - Π(1 - iₖ/10000))`, not a plain sum — losses
 * compound multiplicatively hop over hop, same as the underlying constant-
 * product math. An empty list (no hops) has no impact.
 */
export function combineImpactBps(impacts: number[]): number {
  const remaining = impacts.reduce((acc, bps) => acc * (1 - bps / 10000), 1);
  return Math.round(10000 * (1 - remaining));
}
/**
 * Mid price (spot, no fee) of 1 whole `base` token expressed in `quote`
 * units, as an 1e18 fixed-point bigint — decimals-normalized so a pair with
 * mismatched ERC20 decimals (e.g. USDC.e's 6 vs WETH's 18) doesn't skew the
 * result. Task 21's on-chain USD price display feeds pool reserves straight
 * into this (base = the priced token, quote = USDC.e, the $1 anchor) rather
 * than calling any external price API.
 */
export function midPriceE18(
  reserveBase: bigint,
  reserveQuote: bigint,
  decimalsBase: number,
  decimalsQuote: number,
): bigint {
  if (reserveBase <= 0n || reserveQuote <= 0n) throw new Error("INSUFFICIENT_LIQUIDITY");
  return (reserveQuote * 10n ** BigInt(decimalsBase) * 10n ** 18n) / (reserveBase * 10n ** BigInt(decimalsQuote));
}
