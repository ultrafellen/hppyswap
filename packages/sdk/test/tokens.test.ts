// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";
import { ADDRESSES } from "../src/addresses";
import { DEFAULT_TOKENS, NATIVE_ETH, ROUTE_BASES, ROUTE_BASE_TOKENS, USD_ANCHOR } from "../src/tokens";

describe("ROUTE_BASE_TOKENS", () => {
  it("labels the WETH route base 'WETH', not 'ETH' — even though NATIVE_ETH shares its address", () => {
    // Regression guard for the mislabeled via-route bug: NATIVE_ETH in
    // DEFAULT_TOKENS uses the WETH contract address (there's no separate
    // native-ETH address to route through), so resolving a route base's
    // symbol via a DEFAULT_TOKENS lookup would incorrectly surface "ETH".
    expect(NATIVE_ETH.address.toLowerCase()).toBe(ADDRESSES.weth.toLowerCase());
    const wethBase = ROUTE_BASE_TOKENS.find(
      (t) => t.address.toLowerCase() === ADDRESSES.weth.toLowerCase(),
    );
    expect(wethBase?.symbol).toBe("WETH");
    expect(wethBase?.symbol).not.toBe(NATIVE_ETH.symbol);
  });

  it("gives every route base its own symbol, independent of DEFAULT_TOKENS", () => {
    expect(ROUTE_BASE_TOKENS).toEqual([
      { address: ADDRESSES.weth, symbol: "WETH" },
      { address: expect.any(String), symbol: "USDC.e" },
    ]);
  });

  it("ROUTE_BASES stays a plain address list derived from ROUTE_BASE_TOKENS", () => {
    expect(ROUTE_BASES).toEqual(ROUTE_BASE_TOKENS.map((t) => t.address));
    expect(ROUTE_BASES).toEqual([ADDRESSES.weth, DEFAULT_TOKENS[2].address]);
  });
});

describe("USD_ANCHOR", () => {
  it("is the same USDC.e entry already in DEFAULT_TOKENS, not a duplicate literal", () => {
    expect(USD_ANCHOR).toBe(DEFAULT_TOKENS[2]);
    expect(USD_ANCHOR.symbol).toBe("USDC.e");
    expect(USD_ANCHOR.decimals).toBe(6);
  });
});
