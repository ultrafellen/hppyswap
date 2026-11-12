// SPDX-License-Identifier: MIT
import { createConfig, http } from "wagmi";
import { hpp } from "@hppyswap/sdk";
import { getStoredRpcUrl } from "./settings";

// wagmi 3's createConfig auto-discovers EIP-6963 injected wallets
// (multiInjectedProviderDiscovery defaults to true) — no explicit connectors needed.
//
// pollingInterval: HPP Mainnet averages ~11s blocks, and wagmi's 4s default
// can add up to 4s of dead time after a block lands before a pending
// receipt is noticed. 2s halves that for a negligible extra eth_blockNumber
// call while a transaction is actually pending.
export const wagmiConfig = createConfig({
  chains: [hpp],
  pollingInterval: 2_000,
  transports: { [hpp.id]: http(getStoredRpcUrl() ?? undefined, { batch: true }) },
});
