// SPDX-License-Identifier: MIT
import type { APIRoute } from "astro";
import { factoryAbi, routerAbi, pairAbi, wethAbi, erc20Abi } from "@hppyswap/sdk";

export const GET: APIRoute = () => {
  // Plain-JSON ABI arrays for agents without a TypeScript toolchain to
  // `import { ... } from "@hppyswap/sdk"` directly — same ABIs, same
  // source (contracts/out/ via packages/sdk/scripts/sync-abis.mjs), just
  // served as data instead of code.
  return new Response(
    JSON.stringify(
      {
        factory: factoryAbi,
        router: routerAbi,
        pair: pairAbi,
        weth: wethAbi,
        erc20: erc20Abi,
      },
      null,
      2,
    ),
    { headers: { "Content-Type": "application/json" } },
  );
};
