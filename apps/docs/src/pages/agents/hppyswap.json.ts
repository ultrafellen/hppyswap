// SPDX-License-Identifier: MIT
import type { APIRoute } from "astro";
import { hpp, ADDRESSES, DEFAULT_TOKENS, ROUTE_BASES, isDeployed } from "@hppyswap/sdk";

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify(
      {
        name: "HPPYSwap",
        version: 1,
        app: "https://hppy.ai",
        docs: "https://docs.hppy.ai",
        llms: "https://docs.hppy.ai/llms.txt",
        chain: {
          id: hpp.id,
          name: hpp.name,
          rpc: hpp.rpcUrls.default.http[0],
          explorer: hpp.blockExplorers!.default.url,
        },
        deployed: isDeployed(),
        contracts: ADDRESSES,
        tokens: DEFAULT_TOKENS,
        routeBases: ROUTE_BASES,
        uiSelectorsDoc: "https://docs.hppy.ai/agents/ui-selectors/",
      },
      null,
      2,
    ),
    { headers: { "Content-Type": "application/json" } },
  );
