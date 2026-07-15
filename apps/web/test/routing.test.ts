// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";
import type { Address } from "viem";
import { buildCandidatePaths, pickBestRoute, type RouteCandidate } from "../src/lib/routing";

const IN = "0x1111111111111111111111111111111111111a" as Address;
const OUT = "0x2222222222222222222222222222222222222b" as Address;
const WETH = "0x3333333333333333333333333333333333333c" as Address;
const USDC_E = "0x4444444444444444444444444444444444444d" as Address;

const BASES = [
  { address: WETH, symbol: "WETH" },
  { address: USDC_E, symbol: "USDC.e" },
];

describe("buildCandidatePaths", () => {
  it("puts the direct candidate first, then a via candidate per base", () => {
    expect(buildCandidatePaths(IN, OUT, BASES)).toEqual([
      { path: [IN, OUT], kind: "direct" },
      { path: [IN, WETH, OUT], kind: "via", baseSymbol: "WETH" },
      { path: [IN, USDC_E, OUT], kind: "via", baseSymbol: "USDC.e" },
    ]);
  });

  it("skips a base that equals tokenIn (would be a degenerate 0-length hop)", () => {
    expect(buildCandidatePaths(WETH, OUT, BASES)).toEqual([
      { path: [WETH, OUT], kind: "direct" },
      { path: [WETH, USDC_E, OUT], kind: "via", baseSymbol: "USDC.e" },
    ]);
  });

  it("skips a base that equals tokenOut", () => {
    expect(buildCandidatePaths(IN, USDC_E, BASES)).toEqual([
      { path: [IN, USDC_E], kind: "direct" },
      { path: [IN, WETH, USDC_E], kind: "via", baseSymbol: "WETH" },
    ]);
  });

  it("skips a base case-insensitively", () => {
    const upperBases = [{ address: WETH.toUpperCase() as Address, symbol: "WETH" }];
    expect(buildCandidatePaths(WETH, OUT, upperBases)).toEqual([{ path: [WETH, OUT], kind: "direct" }]);
  });

  it("returns just the direct candidate when there are no bases", () => {
    expect(buildCandidatePaths(IN, OUT, [])).toEqual([{ path: [IN, OUT], kind: "direct" }]);
  });
});

describe("pickBestRoute", () => {
  const direct: RouteCandidate = { path: [IN, OUT], kind: "direct" };
  const viaWeth: RouteCandidate = { path: [IN, WETH, OUT], kind: "via", baseSymbol: "WETH" };
  const viaUsdc: RouteCandidate = { path: [IN, USDC_E, OUT], kind: "via", baseSymbol: "USDC.e" };

  it("prefers direct when it quotes at least as well as any via route", () => {
    const result = pickBestRoute([
      { candidate: direct, amountOut: 100n },
      { candidate: viaWeth, amountOut: 90n },
    ]);
    expect(result).toEqual({ candidate: direct, amountOut: 100n });
  });

  it("keeps direct on an exact tie with a via route", () => {
    const result = pickBestRoute([
      { candidate: direct, amountOut: 100n },
      { candidate: viaWeth, amountOut: 100n },
    ]);
    expect(result).toEqual({ candidate: direct, amountOut: 100n });
  });

  it("picks the via route when it quotes strictly better than direct", () => {
    const result = pickBestRoute([
      { candidate: direct, amountOut: 90n },
      { candidate: viaWeth, amountOut: 100n },
    ]);
    expect(result).toEqual({ candidate: viaWeth, amountOut: 100n });
  });

  it("picks the best via route when direct has no pool (null)", () => {
    const result = pickBestRoute([
      { candidate: direct, amountOut: null },
      { candidate: viaWeth, amountOut: 80n },
      { candidate: viaUsdc, amountOut: 120n },
    ]);
    expect(result).toEqual({ candidate: viaUsdc, amountOut: 120n });
  });

  it("returns null when every candidate failed to quote", () => {
    const result = pickBestRoute([
      { candidate: direct, amountOut: null },
      { candidate: viaWeth, amountOut: null },
    ]);
    expect(result).toBeNull();
  });

  it("returns null for an empty list", () => {
    expect(pickBestRoute([])).toBeNull();
  });
});
