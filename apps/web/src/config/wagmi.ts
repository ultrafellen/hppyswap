// SPDX-License-Identifier: MIT
import { createConfig, http } from "wagmi";
import { hpp } from "@hppyswap/sdk";
import { getStoredRpcUrl } from "./settings";

// wagmi 3's createConfig auto-discovers EIP-6963 injected wallets
// (multiInjectedProviderDiscovery defaults to true) — no explicit connectors needed.
export const wagmiConfig = createConfig({
  chains: [hpp],
  transports: { [hpp.id]: http(getStoredRpcUrl() ?? undefined, { batch: true }) },
});
