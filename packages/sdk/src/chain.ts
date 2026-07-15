// SPDX-License-Identifier: MIT
import { defineChain } from "viem";

export const hpp = defineChain({
  id: 190415,
  name: "HPP Mainnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://mainnet.hpp.io"], webSocket: ["wss://mainnet.hpp.io"] } },
  blockExplorers: { default: { name: "HPP Explorer", url: "https://explorer.hpp.io" } },
  contracts: { multicall3: { address: "0xcA11bde05977b3631167028862bE2a173976CA11" } },
});
