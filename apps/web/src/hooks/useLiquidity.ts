// SPDX-License-Identifier: MIT
import { useCallback, useRef, useState } from "react";
import type { Address, Hex } from "viem";
import { useConnection } from "wagmi";
import { readContract, waitForTransactionReceipt, writeContract } from "wagmi/actions";
import { ADDRESSES, erc20Abi, isDeployed, pairAbi, routerAbi } from "@hppyswap/sdk";
import { wagmiConfig } from "../config/wagmi";
import { useSettings } from "./useSettings";
import { humanizeError } from "../lib/errors";
import { computeAddAmountsMin, computeRemoveAmountsMin } from "../lib/liquidity";
import type { SwapStatus } from "./useSwap";

export type { SwapStatus };

export type AddLiquidityParams = {
  tokenA: Address;
  tokenB: Address;
  amountADesired: bigint;
  amountBDesired: bigint;
  /**
   * Existing pool reserves in (tokenA, tokenB) order — `null` for a
   * brand-new pool. Only used to decide amountMin (0 for a new pool, no
   * ratio to protect yet); the desired amounts themselves are whatever the
   * caller already resolved (ratio-derived for an existing pool, freely
   * typed for a new one).
   */
  reserves: { reserveA: bigint; reserveB: bigint } | null;
};

export type RemoveLiquidityParams = {
  tokenA: Address;
  tokenB: Address;
  pairAddress: Address;
  liquidity: bigint;
  totalSupply: bigint;
  reserveA: bigint;
  reserveB: bigint;
};

export type UseLiquidityReturn = {
  addLiquidity: (params: AddLiquidityParams) => Promise<Hex>;
  removeLiquidity: (params: RemoveLiquidityParams) => Promise<Hex>;
  status: SwapStatus;
  error: string | null;
  /**
   * Returns `status` to "idle" and clears `error`. No-op while a tx is
   * actually in flight ("approving"/"pending"), same guard as useSwap's
   * reset — callers (e.g. input-edit handlers) can't clobber a live send.
   */
  reset: () => void;
};

/** True when `address` is the chain's canonical WETH — the router's ETH leg. */
function isWeth(address: Address): boolean {
  return address.toLowerCase() === ADDRESSES.weth.toLowerCase();
}

async function approveIfShort(owner: Address, token: Address, amount: bigint, setStatus: (s: SwapStatus) => void) {
  const allowance = await readContract(wagmiConfig, {
    address: token,
    abi: erc20Abi,
    functionName: "allowance",
    args: [owner, ADDRESSES.router],
  });
  if (allowance < amount) {
    setStatus("approving");
    const approveHash = await writeContract(wagmiConfig, {
      address: token,
      abi: erc20Abi,
      functionName: "approve",
      args: [ADDRESSES.router, amount],
    });
    const approveReceipt = await waitForTransactionReceipt(wagmiConfig, { hash: approveHash });
    if (approveReceipt.status !== "success") throw new Error("approval transaction reverted");
  }
}

/**
 * Owns the approve -> add/remove -> wait-for-receipt flows for the pool
 * detail page, mirroring useSwap's shape and state machine (SwapStatus is
 * reused verbatim, same reset-guard). amountMin values and the "brand-new
 * pool has no ratio to protect" case are computed via lib/liquidity.ts's
 * pure helpers, which are unit tested directly — this hook just wires them
 * up to the actual contract calls.
 */
export function useLiquidity(): UseLiquidityReturn {
  const { address: owner } = useConnection();
  const { settings } = useSettings();
  const [status, setStatus] = useState<SwapStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const statusRef = useRef(status);
  statusRef.current = status;

  const reset = useCallback(() => {
    if (statusRef.current === "approving" || statusRef.current === "pending") return;
    setStatus("idle");
    setError(null);
  }, []);

  const addLiquidity = useCallback(
    async ({ tokenA, tokenB, amountADesired, amountBDesired, reserves }: AddLiquidityParams): Promise<Hex> => {
      setError(null);
      try {
        if (!isDeployed()) throw new Error("contracts not deployed");
        if (!owner) throw new Error("wallet not connected");

        const { amountAMin, amountBMin } = computeAddAmountsMin(
          amountADesired,
          amountBDesired,
          reserves != null,
          settings.slippageBps,
        );
        const deadline = BigInt(Math.floor(Date.now() / 1000) + settings.deadlineMinutes * 60);

        const nativeA = isWeth(tokenA);
        const nativeB = isWeth(tokenB);

        // Approve each ERC20 side that's short on router allowance,
        // sequentially (native ETH needs no approval).
        if (!nativeA) await approveIfShort(owner, tokenA, amountADesired, setStatus);
        if (!nativeB) await approveIfShort(owner, tokenB, amountBDesired, setStatus);

        setStatus("pending");
        let hash: Hex;
        if (nativeA) {
          hash = await writeContract(wagmiConfig, {
            address: ADDRESSES.router,
            abi: routerAbi,
            functionName: "addLiquidityETH",
            args: [tokenB, amountBDesired, amountBMin, amountAMin, owner, deadline],
            value: amountADesired,
          });
        } else if (nativeB) {
          hash = await writeContract(wagmiConfig, {
            address: ADDRESSES.router,
            abi: routerAbi,
            functionName: "addLiquidityETH",
            args: [tokenA, amountADesired, amountAMin, amountBMin, owner, deadline],
            value: amountBDesired,
          });
        } else {
          hash = await writeContract(wagmiConfig, {
            address: ADDRESSES.router,
            abi: routerAbi,
            functionName: "addLiquidity",
            args: [tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin, owner, deadline],
          });
        }

        const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });
        if (receipt.status !== "success") throw new Error("transaction reverted");

        setStatus("success");
        return hash;
      } catch (e) {
        setError(humanizeError(e));
        setStatus("error");
        throw e;
      }
    },
    [owner, settings.slippageBps, settings.deadlineMinutes],
  );

  const removeLiquidity = useCallback(
    async ({
      tokenA,
      tokenB,
      pairAddress,
      liquidity,
      totalSupply,
      reserveA,
      reserveB,
    }: RemoveLiquidityParams): Promise<Hex> => {
      setError(null);
      try {
        if (!isDeployed()) throw new Error("contracts not deployed");
        if (!owner) throw new Error("wallet not connected");

        const { amountAMin, amountBMin } = computeRemoveAmountsMin(
          liquidity,
          totalSupply,
          reserveA,
          reserveB,
          settings.slippageBps,
        );
        const deadline = BigInt(Math.floor(Date.now() / 1000) + settings.deadlineMinutes * 60);

        // The LP token (the pair contract itself) needs router allowance
        // before it can pull `liquidity` in for the burn.
        const allowance = await readContract(wagmiConfig, {
          address: pairAddress,
          abi: pairAbi,
          functionName: "allowance",
          args: [owner, ADDRESSES.router],
        });
        if (allowance < liquidity) {
          setStatus("approving");
          const approveHash = await writeContract(wagmiConfig, {
            address: pairAddress,
            abi: pairAbi,
            functionName: "approve",
            args: [ADDRESSES.router, liquidity],
          });
          const approveReceipt = await waitForTransactionReceipt(wagmiConfig, { hash: approveHash });
          if (approveReceipt.status !== "success") throw new Error("approval transaction reverted");
        }

        setStatus("pending");
        const nativeA = isWeth(tokenA);
        const nativeB = isWeth(tokenB);

        let hash: Hex;
        if (nativeA) {
          hash = await writeContract(wagmiConfig, {
            address: ADDRESSES.router,
            abi: routerAbi,
            functionName: "removeLiquidityETH",
            args: [tokenB, liquidity, amountBMin, amountAMin, owner, deadline],
          });
        } else if (nativeB) {
          hash = await writeContract(wagmiConfig, {
            address: ADDRESSES.router,
            abi: routerAbi,
            functionName: "removeLiquidityETH",
            args: [tokenA, liquidity, amountAMin, amountBMin, owner, deadline],
          });
        } else {
          hash = await writeContract(wagmiConfig, {
            address: ADDRESSES.router,
            abi: routerAbi,
            functionName: "removeLiquidity",
            args: [tokenA, tokenB, liquidity, amountAMin, amountBMin, owner, deadline],
          });
        }

        const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });
        if (receipt.status !== "success") throw new Error("transaction reverted");

        setStatus("success");
        return hash;
      } catch (e) {
        setError(humanizeError(e));
        setStatus("error");
        throw e;
      }
    },
    [owner, settings.slippageBps, settings.deadlineMinutes],
  );

  return { addLiquidity, removeLiquidity, status, error, reset };
}
