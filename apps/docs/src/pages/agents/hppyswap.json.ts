// SPDX-License-Identifier: MIT
import type { APIRoute } from "astro";
import { hpp, ADDRESSES, DEFAULT_TOKENS, ROUTE_BASES, USD_ANCHOR, isDeployed } from "@hppyswap/sdk";

export const GET: APIRoute = () => {
  // Map tokens to make logoURI absolute against the app origin (https://hppy.ai).
  // Logo assets are served by the app origin, so relative paths must be resolved there.
  const tokens = DEFAULT_TOKENS.map((t) => ({
    ...t,
    logoURI: t.logoURI ? `https://hppy.ai${t.logoURI}` : undefined,
  }));

  return new Response(
    JSON.stringify(
      {
        name: "HPPYSwap",
        version: 1,
        status: "experimental",
        disclaimer:
          "HPPYSwap is an experimental, open-source personal project. The AMM contracts are a faithful fork of Uniswap V2, but this deployment has not been independently audited, and liquidity is small. It is non-custodial and has no protocol fee — but use it at your own risk, with funds you can afford to lose.",
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
        tokens,
        routeBases: ROUTE_BASES,
        // The $1 price anchor Task 21's USD display derives every price
        // from (directly, or bridged through WETH) — no external price API.
        usdAnchor: USD_ANCHOR.address,
        uiSelectorsDoc: "https://docs.hppy.ai/agents/ui-selectors/",
      },
      null,
      2,
    ),
    { headers: { "Content-Type": "application/json" } },
  );
};
