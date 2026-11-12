// SPDX-License-Identifier: MIT
import { useConnection } from "wagmi";
import { hpp } from "@hppyswap/sdk";

/**
 * True while a wallet is connected but sitting on a chain other than HPP
 * Mainnet. Pages use it to disable their execute buttons and explain why —
 * the hooks also pin `chainId: hpp.id` on every action, so this is the
 * friendly front-line check, not the only one.
 */
export function useWrongNetwork(): boolean {
  const { isConnected, chainId } = useConnection();
  return isConnected && chainId != null && chainId !== hpp.id;
}
