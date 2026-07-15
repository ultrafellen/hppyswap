import { describe, expect, it } from "vitest";
import { getAmountOut, getAmountIn, quote, applySlippage, priceImpactBps } from "../src/math";

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
