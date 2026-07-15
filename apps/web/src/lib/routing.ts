// SPDX-License-Identifier: MIT
import type { Address } from "viem";

export type RouteCandidate = { path: Address[]; kind: "direct" | "via"; baseSymbol?: string };

export type RouteBase = { address: Address; symbol: string };

/**
 * Every path worth quoting for a (tokenIn, tokenOut) swap: the direct pair
 * first, then one 2-hop candidate per route base (Task 17's ETH -> HPP fix
 * — no direct pair, but ETH/USDC.e and USDC.e/HPP both exist). A base that
 * equals tokenIn or tokenOut is skipped rather than producing a degenerate
 * path with a repeated/zero-length hop (compared case-insensitively, same
 * as the rest of the app's address handling).
 */
export function buildCandidatePaths(
  tokenIn: Address,
  tokenOut: Address,
  bases: RouteBase[],
): RouteCandidate[] {
  const candidates: RouteCandidate[] = [{ path: [tokenIn, tokenOut], kind: "direct" }];
  for (const base of bases) {
    if (base.address.toLowerCase() === tokenIn.toLowerCase()) continue;
    if (base.address.toLowerCase() === tokenOut.toLowerCase()) continue;
    candidates.push({ path: [tokenIn, base.address, tokenOut], kind: "via", baseSymbol: base.symbol });
  }
  return candidates;
}

/**
 * Picks the best-quoted candidate: the highest `amountOut` among the
 * candidates that actually quoted (a `null` amountOut means that path's
 * `getAmountsOut` call failed — no pool on one of its hops — and is
 * dropped). A direct pair is preferred over a same-or-worse via route —
 * only a via route that quotes strictly higher than direct wins, so an
 * exact tie keeps direct. Returns `null` when nothing quoted at all.
 */
export function pickBestRoute(
  quoted: { candidate: RouteCandidate; amountOut: bigint | null }[],
): { candidate: RouteCandidate; amountOut: bigint } | null {
  const valid = quoted.filter(
    (q): q is { candidate: RouteCandidate; amountOut: bigint } => q.amountOut != null,
  );
  if (valid.length === 0) return null;

  const direct = valid.find((q) => q.candidate.kind === "direct");
  let best = direct ?? valid[0];
  for (const q of valid) {
    if (q.amountOut > best.amountOut) best = q;
  }
  return best;
}
