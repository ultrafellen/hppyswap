// SPDX-License-Identifier: MIT
import type { Address } from "viem";
import { ADDRESSES } from "./addresses";

export type TokenInfo = {
  address: Address; symbol: string; name: string; decimals: number; isNative?: boolean;
};
export const NATIVE_ETH: TokenInfo = {
  address: ADDRESSES.weth, symbol: "ETH", name: "Ether", decimals: 18, isNative: true,
};
// Addresses verified on-chain 2026-07-15 (Task 16 mainnet deployment) via cast.
export const HPP: TokenInfo = {
  address: "0xB48334E7938367bC24Fe1F19000D6f06C622E6c7", symbol: "HPP", name: "HousePartyProtocol", decimals: 18,
};
export const USDC_E: TokenInfo = {
  address: "0x401eCb1D350407f13ba348573E5630B83638E30D", symbol: "USDC.e", name: "Bridged USDC", decimals: 6,
};
export const DEFAULT_TOKENS: TokenInfo[] = [NATIVE_ETH, HPP, USDC_E];
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
