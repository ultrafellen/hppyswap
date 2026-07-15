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
