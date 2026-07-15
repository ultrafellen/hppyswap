// SPDX-License-Identifier: MIT
import type { Address } from "viem";
import { ADDRESSES } from "./addresses";

export type TokenInfo = {
  address: Address; symbol: string; name: string; decimals: number; isNative?: boolean;
  /**
   * Root-relative path to a 64x64 icon (Task 18), e.g. "/tokens/eth.png".
   * Served from `apps/web/public/tokens/` — resolve against the web app's
   * origin (`https://hppy.ai`) when consuming this outside that app (e.g.
   * from the agent manifest). Self-hosted, not hotlinked, so this never
   * points at a third-party CDN. Absent for custom-imported tokens, which
   * have no known icon.
   */
  logoURI?: string;
};
export const NATIVE_ETH: TokenInfo = {
  address: ADDRESSES.weth, symbol: "ETH", name: "Ether", decimals: 18, isNative: true,
  logoURI: "/tokens/eth.png",
};
// Addresses verified on-chain 2026-07-15 (Task 16 mainnet deployment) via cast.
export const HPP: TokenInfo = {
  address: "0xB48334E7938367bC24Fe1F19000D6f06C622E6c7", symbol: "HPP", name: "HousePartyProtocol", decimals: 18,
  logoURI: "/tokens/hpp.png",
};
export const USDC_E: TokenInfo = {
  address: "0x401eCb1D350407f13ba348573E5630B83638E30D", symbol: "USDC.e", name: "Bridged USDC", decimals: 6,
  logoURI: "/tokens/usdce.png",
};
export const DEFAULT_TOKENS: TokenInfo[] = [NATIVE_ETH, HPP, USDC_E];
/**
 * The $1 price anchor for Task 21's on-chain USD price display: no external
 * price feed, so every USD figure in the app is ultimately "how much
 * USDC.e does the AMM say this is worth" (directly, or via a WETH-bridged
 * mid price for tokens with no direct USDC.e pool). Reuses the existing
 * `USDC_E` object rather than a duplicate literal, so it can never drift
 * from `DEFAULT_TOKENS`' entry.
 */
export const USD_ANCHOR: TokenInfo = USDC_E;
/**
 * Intermediate tokens the swap router tries as a 2-hop bridge when no
 * direct pair exists (Task 17) — e.g. ETH -> USDC.e -> HPP when ETH/HPP has
 * no pool but ETH/USDC.e and USDC.e/HPP both do. Deliberately just these
 * two: WETH and USDC.e are the tokens every existing pool is paired
 * against, so they're the bases most likely to bridge a missing direct
 * pair. Not derived from DEFAULT_TOKENS (which includes HPP, not a useful
 * routing base) or extended beyond 2 hops (YAGNI).
 *
 * Symbols are given explicitly here rather than resolved by looking the
 * address up in DEFAULT_TOKENS: the WETH route base shares its address with
 * NATIVE_ETH (both wrap the same contract), so a DEFAULT_TOKENS lookup
 * would resolve it to "ETH" and a via-WETH route would display the
 * misleading "via ETH" — only WETH itself moves mid-route, ETH never does
 * (Task 17 fix-review finding).
 */
export const ROUTE_BASE_TOKENS: { address: Address; symbol: string }[] = [
  { address: ADDRESSES.weth, symbol: "WETH" },
  { address: USDC_E.address, symbol: "USDC.e" },
];
/** Plain addresses, derived from ROUTE_BASE_TOKENS — kept for callers (e.g. the agent manifest's `routeBases`) that only need the address list. */
export const ROUTE_BASES: Address[] = ROUTE_BASE_TOKENS.map((t) => t.address);
