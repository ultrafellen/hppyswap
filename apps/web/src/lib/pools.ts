// SPDX-License-Identifier: MIT
import type { Address } from "viem";
import type { PoolRow, TokenMeta } from "../hooks/usePools";

/** Per-pair reads (token0/token1/getReserves) before token metadata is joined in. */
export type PairInfo = {
  pair: Address;
  token0: Address;
  token1: Address;
  reserve0: bigint;
  reserve1: bigint;
};

/**
 * Collects the unique token addresses referenced by a batch of pair reads,
 * case-insensitively deduped and in first-seen order (token0 before token1
 * within each pair). Feeds usePools' third multicall stage (symbol/decimals
 * batched once per distinct token rather than once per pair-side).
 */
export function dedupeTokenAddresses(pairs: readonly PairInfo[]): Address[] {
  const seen = new Set<string>();
  const result: Address[] = [];
  for (const { token0, token1 } of pairs) {
    for (const addr of [token0, token1]) {
      const key = addr.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(addr);
      }
    }
  }
  return result;
}

/**
 * Joins per-pair reads with the resolved token-metadata batch into the
 * PoolRow shape Task 11 consumes. `tokenMetaByAddress` is keyed by
 * lowercased address. A pair whose token metadata hasn't resolved yet
 * (still loading, or that read failed) is dropped rather than rendered
 * with placeholder data — usePools' isLoading flag covers the "still
 * fetching" case for the caller.
 */
export function buildPoolRows(
  pairs: readonly PairInfo[],
  tokenMetaByAddress: ReadonlyMap<string, TokenMeta>,
): PoolRow[] {
  const rows: PoolRow[] = [];
  for (const p of pairs) {
    const token0 = tokenMetaByAddress.get(p.token0.toLowerCase());
    const token1 = tokenMetaByAddress.get(p.token1.toLowerCase());
    if (!token0 || !token1) continue;
    rows.push({ pair: p.pair, token0, token1, reserve0: p.reserve0, reserve1: p.reserve1 });
  }
  return rows;
}
