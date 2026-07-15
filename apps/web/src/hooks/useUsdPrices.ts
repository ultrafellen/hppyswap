// SPDX-License-Identifier: MIT
import { useMemo } from "react";
import { ADDRESSES, USD_ANCHOR, midPriceE18, type TokenInfo } from "@hppyswap/sdk";
import { usePair } from "./usePair";
import type { TokenMeta } from "./usePools";

const WETH_DECIMALS = 18;
const ONE_E18 = 10n ** 18n;

/**
 * `useUsdPrice` takes the sdk's `TokenInfo` shape, but pool rows (usePools /
 * PoolsPage / PoolDetailPage) only carry the live-fetched `TokenMeta`
 * (address/symbol/decimals — no `name`, since that metadata comes straight
 * off-chain rather than from `DEFAULT_TOKENS`). Pricing only ever reads
 * `.address`/`.decimals`, so filling `name` in from the symbol is enough to
 * satisfy the type without inventing real display data.
 */
export function toPricableToken(meta: TokenMeta): TokenInfo {
  return { address: meta.address, symbol: meta.symbol, name: meta.symbol, decimals: meta.decimals };
}

/**
 * USD price of one whole `token`, as an 1e18 fixed-point bigint anchored to
 * USDC.e (Task 21) — no external price API, only the DEX's own reserves:
 *
 *  - `token` is the anchor itself -> the constant $1 (1e18).
 *  - a direct token/USDC.e pool exists -> its mid price.
 *  - otherwise, bridged through WETH: token/WETH mid price times WETH's own
 *    USDC.e mid price (both legs must have live reserves; scaled back down
 *    by 1e18 after the bigint multiply so the result stays 1e18
 *    fixed-point).
 *  - none of the above resolves (no pool either way, or a reserve is
 *    still 0) -> `null`, meaning "no USD price known" — callers must not
 *    treat that as $0.
 *
 * `usePair` is always called (never behind a conditional) so its own
 * `enabled` gating — not this hook's control flow — decides whether an RPC
 * read actually fires; that keeps the hook's hook-call count static across
 * renders regardless of which branch ends up pricing the token.
 */
export function useUsdPrice(token: TokenInfo | null): bigint | null {
  const isAnchor = !!token && token.address.toLowerCase() === USD_ANCHOR.address.toLowerCase();

  const directPair = usePair(token?.address, USD_ANCHOR.address);
  // Skipped (both args undefined -> usePair disables itself) once `token`
  // IS the anchor: the $1 shortcut below never needs a WETH bridge, so
  // there's no reason to pay for these two extra reads in that case — on
  // the live pools today (USDC.e/WETH, USDC.e/HPP) that's every row's
  // USDC.e side.
  const hopToWeth = usePair(!isAnchor ? token?.address : undefined, ADDRESSES.weth);
  const wethToAnchor = usePair(!isAnchor ? ADDRESSES.weth : undefined, USD_ANCHOR.address);

  return useMemo(() => {
    if (!token) return null;
    if (isAnchor) return ONE_E18;

    // Both branches below are only entered once their own reserves are
    // already confirmed non-zero, so `midPriceE18`'s only throw condition
    // (a <=0 reserve) can't fire here — no try/catch needed.
    if (directPair.reserves && directPair.reserves.reserveA > 0n && directPair.reserves.reserveB > 0n) {
      return midPriceE18(directPair.reserves.reserveA, directPair.reserves.reserveB, token.decimals, USD_ANCHOR.decimals);
    }

    if (
      hopToWeth.reserves &&
      hopToWeth.reserves.reserveA > 0n &&
      hopToWeth.reserves.reserveB > 0n &&
      wethToAnchor.reserves &&
      wethToAnchor.reserves.reserveA > 0n &&
      wethToAnchor.reserves.reserveB > 0n
    ) {
      const tokenInWethE18 = midPriceE18(hopToWeth.reserves.reserveA, hopToWeth.reserves.reserveB, token.decimals, WETH_DECIMALS);
      const wethInAnchorE18 = midPriceE18(wethToAnchor.reserves.reserveA, wethToAnchor.reserves.reserveB, WETH_DECIMALS, USD_ANCHOR.decimals);
      return (tokenInWethE18 * wethInAnchorE18) / ONE_E18;
    }

    return null;
  }, [token, isAnchor, directPair.reserves, hopToWeth.reserves, wethToAnchor.reserves]);
}
