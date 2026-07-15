// SPDX-License-Identifier: MIT
import type { Address } from "viem";
import { ADDRESSES } from "./addresses";

export type TokenInfo = {
  address: Address; symbol: string; name: string; decimals: number; isNative?: boolean;
};
export const NATIVE_ETH: TokenInfo = {
  address: ADDRESSES.weth, symbol: "ETH", name: "Ether", decimals: 18, isNative: true,
};
// HPP token address: verify on https://docs.hpp.io/getting-started/hpp-contracts
// during Task 16 and update. Until then list stays minimal.
export const DEFAULT_TOKENS: TokenInfo[] = [NATIVE_ETH];
