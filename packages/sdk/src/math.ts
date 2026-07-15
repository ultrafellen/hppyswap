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
