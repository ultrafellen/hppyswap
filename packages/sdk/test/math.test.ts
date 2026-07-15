// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";
import { getAmountOut, getAmountIn, quote, applySlippage, priceImpactBps, combineImpactBps, midPriceE18 } from "../src/math";

describe("getAmountOut", () => {
  it("matches x*y=k with 0.3% fee", () => {
    // 1e18 in, reserves 1000e18/1000e18 => 997*1e18*1000e18 / (1000e18*1000 + 997*1e18)
    expect(getAmountOut(10n ** 18n, 1000n * 10n ** 18n, 1000n * 10n ** 18n))
      .toBe(996006981039903216n);
  });
  it("throws on zero input", () => {
    expect(() => getAmountOut(0n, 1n, 1n)).toThrow("INSUFFICIENT_INPUT_AMOUNT");
  });
});
describe("getAmountIn", () => {
  it("is inverse of getAmountOut (rounded up)", () => {
    const out = getAmountOut(10n ** 18n, 5000n * 10n ** 18n, 10000n * 10n ** 18n);
    const back = getAmountIn(out, 5000n * 10n ** 18n, 10000n * 10n ** 18n);
    expect(back).toBeGreaterThanOrEqual(10n ** 18n);
    expect(back - 10n ** 18n).toBeLessThan(10n ** 12n);
  });
});
describe("quote", () => {
  it("is proportional", () => {
    expect(quote(2n * 10n ** 18n, 4n * 10n ** 18n, 8n * 10n ** 18n)).toBe(4n * 10n ** 18n);
  });
});
describe("applySlippage", () => {
  it("50bps lowers amount by 0.5%", () => {
    expect(applySlippage(10000n, 50)).toBe(9950n);
  });
});
describe("priceImpactBps", () => {
  it("small trade ≈ fee only impact", () => {
    const bps = priceImpactBps(10n ** 15n, 1000n * 10n ** 18n, 1000n * 10n ** 18n);
    expect(bps).toBeLessThan(35); // ~0.3% fee + tiny impact
  });
});
describe("combineImpactBps", () => {
  it("returns 0 for an empty list (no hops)", () => {
    expect(combineImpactBps([])).toBe(0);
  });
  it("is the identity for a single hop", () => {
    expect(combineImpactBps([30])).toBe(30);
  });
  it("compounds two hops multiplicatively (1 - Π(1 - i/10000))", () => {
    // 10000 * (1 - 0.997^2) = 59.91 -> rounds to 60.
    expect(combineImpactBps([30, 30])).toBe(60);
  });
  it("stays 0 when every hop has 0 impact", () => {
    expect(combineImpactBps([0, 0])).toBe(0);
  });
});
describe("midPriceE18", () => {
  it("prices 1 WETH (18dp) in USDC.e (6dp) terms — live-pool-shaped ratio 1,934e6 : 1e18", () => {
    // 1,934 USDC.e : 1 WETH reserves -> 1 WETH costs 1,934 USDC.e, as an
    // 1e18 fixed-point bigint (1934 * 1e18).
    expect(midPriceE18(10n ** 18n, 1934000000n, 18, 6)).toBe(1934n * 10n ** 18n);
  });
  it("prices 1 USDC.e (6dp) in WETH (18dp) terms — same reserves, base/quote swapped", () => {
    // Asymmetric-decimals reverse direction: base now has fewer decimals
    // (6) than quote (18). Exact value is 1e18/1934 (reserveQuote=1e18
    // cancels cleanly against the 1e18 fixed-point scale).
    expect(midPriceE18(1934000000n, 10n ** 18n, 6, 18)).toBe(517063081695966n);
  });
  it("throws INSUFFICIENT_LIQUIDITY when the base reserve is zero", () => {
    expect(() => midPriceE18(0n, 1934000000n, 18, 6)).toThrow("INSUFFICIENT_LIQUIDITY");
  });
  it("throws INSUFFICIENT_LIQUIDITY when the quote reserve is zero", () => {
    expect(() => midPriceE18(10n ** 18n, 0n, 18, 6)).toThrow("INSUFFICIENT_LIQUIDITY");
  });
});
