// SPDX-License-Identifier: MIT
import { useMemo } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import type { Address } from "viem";
import { ADDRESSES, erc20Abi, factoryAbi, isDeployed, pairAbi } from "@hppyswap/sdk";
import { buildPoolRows, dedupeTokenAddresses, type PairInfo } from "../lib/pools";

export type TokenMeta = { address: Address; symbol: string; decimals: number };

export type PoolRow = {
  pair: Address;
  token0: TokenMeta;
  token1: TokenMeta;
  reserve0: bigint;
  reserve1: bigint;
};

export type UsePoolsReturn = { pools: PoolRow[]; isLoading: boolean };

const DEFAULT_LIMIT = 50;

/**
 * Enumerates pools straight from the factory, no indexer, via multicall
 * stages chained with `query.enabled` so each fires only once the previous
 * one has data:
 *
 *   1. `allPairsLength()` → clamp to the first `limit` indexes
 *   2. batch `allPairs(i)` for those indexes → pair addresses
 *   3. per resolved pair, batch `token0()` / `token1()` / `getReserves()`
 *      (three uniform-functionName multicalls rather than one mixed batch,
 *      so each keeps a precise per-call result type)
 *   4. dedupe the token addresses referenced above, batch `symbol()` /
 *      `decimals()` for each
 *
 * viem's transport batching collapses each stage's per-item calls (and,
 * once several stages are enabled at once, calls across stages) into a
 * small number of RPC round trips rather than one request per read.
 *
 * PoolDetailPage (Task 11) receives a `PoolRow` via router state as a
 * navigation optimization, but re-fetches by address on direct load — so
 * this return shape is the only contract between the two tasks; keep it
 * stable.
 */
export function usePools(limit = DEFAULT_LIMIT): UsePoolsReturn {
  const deployed = isDeployed();

  // Stage 1: how many pairs the factory has created.
  const { data: pairsLengthData, isLoading: isLengthLoading } = useReadContract({
    address: ADDRESSES.factory,
    abi: factoryAbi,
    functionName: "allPairsLength",
    query: { enabled: deployed },
  });

  const count =
    pairsLengthData != null ? Math.min(Number(pairsLengthData), Math.max(limit, 0)) : 0;
  const indices = useMemo(() => Array.from({ length: count }, (_, i) => i), [count]);

  // Stage 2: resolve the first `limit` pair addresses.
  const allPairsEnabled = deployed && indices.length > 0;
  const { data: allPairsData, isLoading: isAllPairsLoading } = useReadContracts({
    contracts: indices.map(
      (i) => ({ address: ADDRESSES.factory, abi: factoryAbi, functionName: "allPairs", args: [BigInt(i)] }) as const,
    ),
    query: { enabled: allPairsEnabled },
  });

  const pairAddresses = useMemo<Address[]>(() => {
    if (!allPairsData) return [];
    const out: Address[] = [];
    for (const r of allPairsData) {
      if (r.status === "success") out.push(r.result);
    }
    return out;
  }, [allPairsData]);

  // Stage 3: token0/token1/reserves for every resolved pair.
  const pairInfoEnabled = deployed && pairAddresses.length > 0;
  const { data: token0Data, isLoading: isToken0Loading } = useReadContracts({
    contracts: pairAddresses.map((pair) => ({ address: pair, abi: pairAbi, functionName: "token0" }) as const),
    query: { enabled: pairInfoEnabled },
  });
  const { data: token1Data, isLoading: isToken1Loading } = useReadContracts({
    contracts: pairAddresses.map((pair) => ({ address: pair, abi: pairAbi, functionName: "token1" }) as const),
    query: { enabled: pairInfoEnabled },
  });
  const { data: reservesData, isLoading: isReservesLoading } = useReadContracts({
    contracts: pairAddresses.map((pair) => ({ address: pair, abi: pairAbi, functionName: "getReserves" }) as const),
    query: { enabled: pairInfoEnabled },
  });

  const pairInfos = useMemo<PairInfo[]>(() => {
    if (!token0Data || !token1Data || !reservesData) return [];
    const out: PairInfo[] = [];
    for (let i = 0; i < pairAddresses.length; i++) {
      const t0 = token0Data[i];
      const t1 = token1Data[i];
      const rs = reservesData[i];
      if (t0?.status !== "success" || t1?.status !== "success" || rs?.status !== "success") continue;
      const [reserve0, reserve1] = rs.result;
      out.push({ pair: pairAddresses[i], token0: t0.result, token1: t1.result, reserve0, reserve1 });
    }
    return out;
  }, [pairAddresses, token0Data, token1Data, reservesData]);

  // Stage 4: symbol/decimals for every distinct token referenced above.
  const tokenAddresses = useMemo(() => dedupeTokenAddresses(pairInfos), [pairInfos]);
  const tokenInfoEnabled = deployed && tokenAddresses.length > 0;
  const { data: symbolData, isLoading: isSymbolLoading } = useReadContracts({
    contracts: tokenAddresses.map((address) => ({ address, abi: erc20Abi, functionName: "symbol" }) as const),
    query: { enabled: tokenInfoEnabled },
  });
  const { data: decimalsData, isLoading: isDecimalsLoading } = useReadContracts({
    contracts: tokenAddresses.map((address) => ({ address, abi: erc20Abi, functionName: "decimals" }) as const),
    query: { enabled: tokenInfoEnabled },
  });

  const pools = useMemo<PoolRow[]>(() => {
    const tokenMetaByAddress = new Map<string, TokenMeta>();
    if (symbolData && decimalsData) {
      for (let i = 0; i < tokenAddresses.length; i++) {
        const symbolResult = symbolData[i];
        const decimalsResult = decimalsData[i];
        if (symbolResult?.status !== "success" || decimalsResult?.status !== "success") continue;
        const address = tokenAddresses[i];
        tokenMetaByAddress.set(address.toLowerCase(), {
          address,
          symbol: symbolResult.result,
          decimals: decimalsResult.result,
        });
      }
    }
    return buildPoolRows(pairInfos, tokenMetaByAddress);
  }, [pairInfos, tokenAddresses, symbolData, decimalsData]);

  const isLoading =
    deployed &&
    (isLengthLoading ||
      (allPairsEnabled && isAllPairsLoading) ||
      (pairInfoEnabled && (isToken0Loading || isToken1Loading || isReservesLoading)) ||
      (tokenInfoEnabled && (isSymbolLoading || isDecimalsLoading)));

  return { pools, isLoading };
}
