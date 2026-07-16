// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";
import type { Address } from "viem";
import { ADDRESSES, USD_ANCHOR } from "@hppyswap/sdk";
import { buildPoolRows, dedupeTokenAddresses, orderForDisplay, type PairInfo } from "../src/lib/pools";
import type { TokenMeta } from "../src/hooks/usePools";

const PAIR_A = "0xaaaa000000000000000000000000000000aaaa" as Address;
const PAIR_B = "0xbbbb000000000000000000000000000000bbbb" as Address;
const TOKEN_X = "0x1111111111111111111111111111111111111a" as Address;
const TOKEN_Y = "0x2222222222222222222222222222222222222b" as Address;
const TOKEN_Z = "0x3333333333333333333333333333333333333c" as Address;

const pairAX_Y: PairInfo = {
  pair: PAIR_A,
  token0: TOKEN_X,
  token1: TOKEN_Y,
  reserve0: 100n,
  reserve1: 200n,
};
const pairBY_Z: PairInfo = {
  pair: PAIR_B,
  token0: TOKEN_Y,
  token1: TOKEN_Z,
  reserve0: 300n,
  reserve1: 400n,
};

describe("dedupeTokenAddresses", () => {
  it("collects unique token addresses in first-seen order", () => {
    expect(dedupeTokenAddresses([pairAX_Y, pairBY_Z])).toEqual([TOKEN_X, TOKEN_Y, TOKEN_Z]);
  });

  it("dedupes case-insensitively, keeping the first-seen casing", () => {
    const upper = { ...pairBY_Z, token0: TOKEN_Y.toUpperCase() as Address };
    expect(dedupeTokenAddresses([pairAX_Y, upper])).toEqual([TOKEN_X, TOKEN_Y, TOKEN_Z]);
  });

  it("returns an empty list for no pairs", () => {
    expect(dedupeTokenAddresses([])).toEqual([]);
  });
});

describe("buildPoolRows", () => {
  const metaX: TokenMeta = { address: TOKEN_X, symbol: "X", decimals: 18 };
  const metaY: TokenMeta = { address: TOKEN_Y, symbol: "Y", decimals: 6 };
  const metaZ: TokenMeta = { address: TOKEN_Z, symbol: "Z", decimals: 18 };

  it("joins pair reads with token metadata into PoolRow, keyed case-insensitively", () => {
    const tokenMeta = new Map([
      [TOKEN_X.toLowerCase(), metaX],
      [TOKEN_Y.toLowerCase(), metaY],
      [TOKEN_Z.toLowerCase(), metaZ],
    ]);

    expect(buildPoolRows([pairAX_Y, pairBY_Z], tokenMeta)).toEqual([
      { pair: PAIR_A, token0: metaX, token1: metaY, reserve0: 100n, reserve1: 200n },
      { pair: PAIR_B, token0: metaY, token1: metaZ, reserve0: 300n, reserve1: 400n },
    ]);
  });

  it("drops a pair whose token metadata hasn't resolved yet", () => {
    const tokenMeta = new Map([[TOKEN_X.toLowerCase(), metaX], [TOKEN_Y.toLowerCase(), metaY]]);
    // pairBY_Z references TOKEN_Z, which isn't in the map yet.
    expect(buildPoolRows([pairAX_Y, pairBY_Z], tokenMeta)).toEqual([
      { pair: PAIR_A, token0: metaX, token1: metaY, reserve0: 100n, reserve1: 200n },
    ]);
  });

  it("returns an empty list for no pairs", () => {
    expect(buildPoolRows([], new Map())).toEqual([]);
  });
});

describe("orderForDisplay", () => {
  // Minimal fixtures — only `address` matters to the ranking, but real
  // callers pass TokenMeta, so shape these the same to catch type drift.
  const usdce: TokenMeta = { address: USD_ANCHOR.address, symbol: "USDC.e", decimals: 6 };
  const weth: TokenMeta = { address: ADDRESSES.weth, symbol: "WETH", decimals: 18 };
  const hpp: TokenMeta = {
    address: "0xB48334E7938367bC24Fe1F19000D6f06C622E6c7" as Address,
    symbol: "HPP",
    decimals: 18,
  };
  const unknownA: TokenMeta = { address: "0x1111111111111111111111111111111111111a" as Address, symbol: "AAA", decimals: 18 };
  const unknownB: TokenMeta = { address: "0x2222222222222222222222222222222222222b" as Address, symbol: "BBB", decimals: 18 };

  it("puts USDC.e last when paired with WETH", () => {
    expect(orderForDisplay(usdce, weth)).toEqual([weth, usdce]);
  });

  it("puts USDC.e last when paired with an unranked token", () => {
    expect(orderForDisplay(usdce, hpp)).toEqual([hpp, usdce]);
  });

  it("puts WETH last when paired with an unranked token", () => {
    expect(orderForDisplay(weth, hpp)).toEqual([hpp, weth]);
  });

  it("keeps the input (address-sorted) order for two unranked tokens", () => {
    expect(orderForDisplay(unknownA, unknownB)).toEqual([unknownA, unknownB]);
  });

  it("is case-insensitive when matching the quote addresses", () => {
    const upperUsdce: TokenMeta = { ...usdce, address: usdce.address.toUpperCase() as Address };
    expect(orderForDisplay(upperUsdce, weth)).toEqual([weth, upperUsdce]);
  });

  it("keeps input order when the base-side token is already last (no-op)", () => {
    expect(orderForDisplay(weth, usdce)).toEqual([weth, usdce]);
  });
});
