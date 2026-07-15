// SPDX-License-Identifier: MIT
import { useCallback, useRef, useState } from "react";
import type { Address, Hex } from "viem";
import { useConnection } from "wagmi";
import { readContract, waitForTransactionReceipt, writeContract } from "wagmi/actions";
import { ADDRESSES, applySlippage, erc20Abi, isDeployed, routerAbi, type TokenInfo } from "@hppyswap/sdk";
import { wagmiConfig } from "../config/wagmi";
import { useSettings } from "./useSettings";
import { humanizeError } from "../lib/errors";

export type SwapStatus = "idle" | "approving" | "pending" | "success" | "error";

export type SwapParams = {
  tokenIn: TokenInfo;
  tokenOut: TokenInfo;
  amountIn: bigint;
  /** Raw output amount quoted from the router's `getAmountsOut` for `amountIn` (pre-slippage). */
  quotedOut: bigint;
  /**
   * The confirmed router path — direct `[in, out]` or a 2-hop `[in, base,
   * out]` (Task 17's multi-hop routing). Always passed explicitly by the
   * caller (the winning candidate from `pickBestRoute`); this hook never
   * re-derives it from `tokenIn`/`tokenOut` so it can't drift from what was
   * actually quoted.
   */
  path: Address[];
};

export type UseSwapReturn = {
  swap: (params: SwapParams) => Promise<Hex>;
  status: SwapStatus;
  error: string | null;
  /**
   * Returns `status` to "idle" and clears `error`. No-op while a swap is
   * actually in flight ("approving"/"pending") so callers (e.g. an effect
   * that resets on input edits) can't clobber a live transaction's status.
   */
  reset: () => void;
};

/**
 * Owns the approve -> swap -> wait-for-receipt flow for the swap page.
 * `amountOutMin`/`deadline` are derived here from the current settings
 * (slippage bps / deadline minutes) so every caller applies them the same
 * way. Every transition is exposed via `status` so the page can render it
 * in the swap-status aria-live region.
 */
export function useSwap(): UseSwapReturn {
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

  const swap = useCallback(
    async ({ tokenIn, tokenOut, amountIn, quotedOut, path }: SwapParams): Promise<Hex> => {
      setError(null);
      try {
        if (!isDeployed()) throw new Error("contracts not deployed");
        if (!owner) throw new Error("wallet not connected");

        const amountOutMin = applySlippage(quotedOut, settings.slippageBps);
        const deadline = BigInt(Math.floor(Date.now() / 1000) + settings.deadlineMinutes * 60);

        // Native ETH needs no approval; ERC20 input needs router allowance
        // first (approve-if-short, exact amountIn — not infinite approval).
        if (!tokenIn.isNative) {
          const allowance = await readContract(wagmiConfig, {
            address: tokenIn.address,
            abi: erc20Abi,
            functionName: "allowance",
            args: [owner, ADDRESSES.router],
          });
          if (allowance < amountIn) {
            setStatus("approving");
            const approveHash = await writeContract(wagmiConfig, {
              address: tokenIn.address,
              abi: erc20Abi,
              functionName: "approve",
              args: [ADDRESSES.router, amountIn],
            });
            const approveReceipt = await waitForTransactionReceipt(wagmiConfig, { hash: approveHash });
            if (approveReceipt.status !== "success") throw new Error("approval transaction reverted");
          }
        }

        setStatus("pending");
        let hash: Hex;
        // Keyed off the path's own ends (not just tokenIn/tokenOut) so a
        // 2-hop route through WETH picks the same ETH-leg function a direct
        // ETH pair would — path[0]/path[last] are what the router actually
        // sees, tokenIn/tokenOut.isNative is what the UI actually selected;
        // both must agree for the native leg to apply.
        if (path[0].toLowerCase() === ADDRESSES.weth.toLowerCase() && tokenIn.isNative) {
          hash = await writeContract(wagmiConfig, {
            address: ADDRESSES.router,
            abi: routerAbi,
            functionName: "swapExactETHForTokens",
            args: [amountOutMin, path, owner, deadline],
            value: amountIn,
          });
        } else if (path[path.length - 1].toLowerCase() === ADDRESSES.weth.toLowerCase() && tokenOut.isNative) {
          hash = await writeContract(wagmiConfig, {
            address: ADDRESSES.router,
            abi: routerAbi,
            functionName: "swapExactTokensForETH",
            args: [amountIn, amountOutMin, path, owner, deadline],
          });
        } else {
          hash = await writeContract(wagmiConfig, {
            address: ADDRESSES.router,
            abi: routerAbi,
            functionName: "swapExactTokensForTokens",
            args: [amountIn, amountOutMin, path, owner, deadline],
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

  return { swap, status, error, reset };
}
