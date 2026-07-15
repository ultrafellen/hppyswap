// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";
import { usdValueE18, formatUsd, formatUsdApprox, poolTvlE18 } from "../src/lib/usd";

describe("usdValueE18", () => {
  it("multiplies an 18-decimal token amount by an 1e18 price", () => {
    // 2 tokens (18dp) at $1,934 each -> $3,868.
    expect(usdValueE18(2n * 10n ** 18n, 18, 1934n * 10n ** 18n)).toBe(3868n * 10n ** 18n);
  });
  it("normalizes a 6-decimal token amount (USDC.e) at the $1 anchor price", () => {
    // 1,934 USDC.e (6dp) at the $1 anchor price -> $1,934.
    expect(usdValueE18(1934000000n, 6, 10n ** 18n)).toBe(1934n * 10n ** 18n);
  });
});

describe("formatUsd", () => {
  it("renders null as empty text (no price/amount known)", () => {
    expect(formatUsd(null)).toBe("");
  });
  it("renders exactly zero as \"$0\"", () => {
    expect(formatUsd(0n)).toBe("$0");
  });
  it("renders sub-cent positive values as \"<$0.01\" (boundary: 0.009)", () => {
    expect(formatUsd(9n * 10n ** 15n)).toBe("<$0.01");
  });
  it("renders exactly one cent as \"$0.01\", not \"<$0.01\" (boundary: 0.01)", () => {
    expect(formatUsd(1n * 10n ** 16n)).toBe("$0.01");
  });
  it("renders a mid-size value with grouping and 2dp", () => {
    expect(formatUsd(1934210000000000000000n)).toBe("$1,934.21");
  });
  it("renders just under $1M with full grouping (boundary: 999999.99)", () => {
    expect(formatUsd(999999990000000000000000n)).toBe("$999,999.99");
  });
  it("abbreviates exactly $1M as \"$1.00M\" (boundary: 1,000,000)", () => {
    expect(formatUsd(1000000000000000000000000n)).toBe("$1.00M");
  });
  it("abbreviates a non-round millions value, floored to 2dp", () => {
    expect(formatUsd(1234567890000000000000000n)).toBe("$1.23M");
  });
});

describe("poolTvlE18", () => {
  it("sums both reserves' USD value — live-pool-shaped 1,934 USDC.e : 1 WETH", () => {
    const usdcReserve = 1934000000n; // 1,934 USDC.e (6dp)
    const wethReserve = 10n ** 18n; // 1 WETH (18dp)
    const usdcPrice = 10n ** 18n; // $1 anchor
    const wethPrice = 1934n * 10n ** 18n; // $1,934/WETH
    expect(poolTvlE18(usdcReserve, 6, usdcPrice, wethReserve, 18, wethPrice)).toBe(3868n * 10n ** 18n);
  });
  it("is null (not a partial sum) when either side's price is unknown", () => {
    expect(poolTvlE18(1934000000n, 6, 10n ** 18n, 10n ** 18n, 18, null)).toBeNull();
    expect(poolTvlE18(1934000000n, 6, null, 10n ** 18n, 18, 1934n * 10n ** 18n)).toBeNull();
  });
});

describe("formatUsdApprox", () => {
  it("renders null as empty text", () => {
    expect(formatUsdApprox(null)).toBe("");
  });
  it("prefixes a normal value with ~", () => {
    expect(formatUsdApprox(1934210000000000000000n)).toBe("~$1,934.21");
  });
  it("does not double up the approximation marker for sub-cent values", () => {
    // "~<$0.01" would read as two conflicting "not exact" markers stacked
    // together; formatUsd's own "<$0.01" already says enough on its own.
    expect(formatUsdApprox(9n * 10n ** 15n)).toBe("<$0.01");
  });
});
