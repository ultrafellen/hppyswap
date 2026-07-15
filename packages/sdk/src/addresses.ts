// SPDX-License-Identifier: MIT
import deployments from "./deployments.json";
import type { Address, Hex } from "viem";

const d = deployments["190415"];
export const ADDRESSES = {
  factory: d.factory as Address,
  router: d.router as Address,
  weth: d.weth as Address,
  multicall3: "0xcA11bde05977b3631167028862bE2a173976CA11" as Address,
  initCodeHash: d.initCodeHash as Hex,
} as const;
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;
export function isDeployed(): boolean { return ADDRESSES.factory !== ZERO_ADDRESS; }
