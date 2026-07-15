// SPDX-License-Identifier: MIT
import { useMemo } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import type { Address } from "viem";
import { ADDRESSES, ZERO_ADDRESS, factoryAbi, isDeployed, pairAbi } from "@hppyswap/sdk";

export type PairReserves = { reserveA: bigint; reserveB: bigint };

export type UsePairReturn = {
  pairAddress: Address | null;
  reserves: PairReserves | null;
  isLoading: boolean;
};

/**
 * Resolves the pool for a (tokenA, tokenB) pair via the factory, then reads
 * its reserves ordered to match the caller's argument order (the pair
 * contract itself always stores reserves in token0/token1 order, which may
 * not match tokenA/tokenB). `pairAddress` is `null` both while unresolved
 * and when the factory returns the zero address (no pool yet) — check
 * `isLoading` to tell the two apart.
 *
 * Shared by the swap page (Task 9) and the pools pages (Tasks 10-11) — keep
 * this return shape stable.
 */
export function usePair(tokenA?: Address, tokenB?: Address): UsePairReturn {
  const pairEnabled =
    isDeployed() && !!tokenA && !!tokenB && tokenA.toLowerCase() !== tokenB.toLowerCase();

  const { data: pairAddressData, isLoading: isPairLoading } = useReadContract({
    address: ADDRESSES.factory,
    abi: factoryAbi,
    functionName: "getPair",
    args: pairEnabled ? [tokenA, tokenB] : undefined,
    query: { enabled: pairEnabled },
  });

  const pairAddress: Address | null =
    pairAddressData && pairAddressData !== ZERO_ADDRESS ? pairAddressData : null;

  const reservesEnabled = pairAddress != null;

  const { data: pairData, isLoading: isReservesLoading } = useReadContracts({
    contracts: [
      { address: pairAddress ?? undefined, abi: pairAbi, functionName: "token0" },
      { address: pairAddress ?? undefined, abi: pairAbi, functionName: "getReserves" },
    ],
    query: { enabled: reservesEnabled },
  });

  const reserves = useMemo<PairReserves | null>(() => {
    if (!pairAddress || !tokenA || !tokenB || !pairData) return null;
    const [token0Result, reservesResult] = pairData;
    if (token0Result?.status !== "success" || reservesResult?.status !== "success") return null;

    const token0 = token0Result.result;
    const [reserve0, reserve1] = reservesResult.result;
    const aIsToken0 = token0.toLowerCase() === tokenA.toLowerCase();
    return aIsToken0 ? { reserveA: reserve0, reserveB: reserve1 } : { reserveA: reserve1, reserveB: reserve0 };
  }, [pairAddress, tokenA, tokenB, pairData]);

  return {
    pairAddress,
    reserves,
    isLoading: pairEnabled && (isPairLoading || (reservesEnabled && isReservesLoading)),
  };
}
