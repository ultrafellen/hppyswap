// SPDX-License-Identifier: MIT
import type { APIRoute } from "astro";
import { hpp, DEFAULT_TOKENS } from "@hppyswap/sdk";

// Built once, at build time (this endpoint is prerendered, same as
// agents/hppyswap.json.ts) — not regenerated per request.
const BUILD_TIME = new Date().toISOString();

export const GET: APIRoute = () => {
  // Uniswap Token List schema (https://github.com/Uniswap/token-lists).
  // DEFAULT_TOKENS' first entry is a native-ETH pseudo-token (isNative:
  // true) that isn't a real ERC-20 contract — a token list has no concept
  // of "native currency", so it's emitted once here as WETH (the address
  // it actually wraps) instead of native ETH. Every other entry maps
  // through unchanged.
  const tokens = DEFAULT_TOKENS.map((t) => ({
    chainId: hpp.id,
    address: t.address,
    symbol: t.isNative ? "WETH" : t.symbol,
    name: t.isNative ? "Wrapped Ether" : t.name,
    decimals: t.decimals,
    logoURI: t.logoURI ? `https://hppy.ai${t.logoURI}` : undefined,
  }));

  return new Response(
    JSON.stringify(
      {
        name: "HPPYSwap Default",
        timestamp: BUILD_TIME,
        version: { major: 1, minor: 0, patch: 0 },
        tokens,
      },
      null,
      2,
    ),
    { headers: { "Content-Type": "application/json" } },
  );
};
