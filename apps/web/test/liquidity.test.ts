// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";
import {
  computeAddAmountsMin,
  computeRemoveAmountsMin,
  computeSharePercent,
  deriveSecondAmount,
  lpAmountForPercent,
} from "../src/lib/liquidity";

describe("deriveSecondAmount", () => {
  it("derives the ratio-locked second amount for an existing pool", () => {
    expect(deriveSecondAmount(2n * 10n ** 18n, 4n * 10n ** 18n, 8n * 10n ** 18n)).toBe(4n * 10n ** 18n);
  });

  it("returns null for a brand-new pool (zero reserves) — nothing to lock the ratio to", () => {
    expect(deriveSecondAmount(10n ** 18n, 0n, 0n)).toBeNull();
    expect(deriveSecondAmount(10n ** 18n, 0n, 5n)).toBeNull();
  });

  it("returns null for a null, zero, or negative amount", () => {
    expect(deriveSecondAmount(null, 1n, 1n)).toBeNull();
    expect(deriveSecondAmount(0n, 1n, 1n)).toBeNull();
    expect(deriveSecondAmount(-1n, 1n, 1n)).toBeNull();
  });
});

describe("computeAddAmountsMin", () => {
  it("applies slippage to both desired amounts for an existing pool", () => {
    expect(computeAddAmountsMin(10000n, 20000n, true, 50)).toEqual({ amountAMin: 9950n, amountBMin: 19900n });
  });

  it("is zero on both sides for a brand-new pool — no ratio to protect", () => {
    expect(computeAddAmountsMin(10000n, 20000n, false, 50)).toEqual({ amountAMin: 0n, amountBMin: 0n });
  });
});

describe("computeRemoveAmountsMin", () => {
  it("derives the share-of-reserves for the burned liquidity, then applies slippage", () => {
    // 250 of 1000 total LP (25%) against a 1000/2000 reserve pool => 250/500
    // raw shares, then 0.5% slippage knocks each down.
    expect(computeRemoveAmountsMin(250n, 1000n, 1000n, 2000n, 50)).toEqual({
      amountAMin: 248n, // 250 * 0.995 = 248.75 -> floors to 248
      amountBMin: 497n, // 500 * 0.995 = 497.5 -> floors to 497
    });
  });

  it("is zero when there is no liquidity being burned or no supply yet", () => {
    expect(computeRemoveAmountsMin(0n, 1000n, 1000n, 2000n, 50)).toEqual({ amountAMin: 0n, amountBMin: 0n });
    expect(computeRemoveAmountsMin(100n, 0n, 1000n, 2000n, 50)).toEqual({ amountAMin: 0n, amountBMin: 0n });
  });
});

describe("lpAmountForPercent", () => {
  it("computes the proportional LP amount for the 25/50/75/100 presets", () => {
    expect(lpAmountForPercent(1000n, 25)).toBe(250n);
    expect(lpAmountForPercent(1000n, 50)).toBe(500n);
    expect(lpAmountForPercent(1000n, 75)).toBe(750n);
    expect(lpAmountForPercent(1000n, 100)).toBe(1000n);
  });

  it("returns exactly the full balance at 100%, even for rounding-prone balances", () => {
    // 7 * 100 / 100 happens to be exact, but the 100% preset should always
    // hand back the literal balance rather than relying on that division.
    expect(lpAmountForPercent(7n, 100)).toBe(7n);
  });

  it("is zero for a zero balance or a non-positive percent", () => {
    expect(lpAmountForPercent(0n, 50)).toBe(0n);
    expect(lpAmountForPercent(1000n, 0)).toBe(0n);
    expect(lpAmountForPercent(1000n, -10)).toBe(0n);
  });
});

describe("computeSharePercent", () => {
  it("computes the caller's percent share of total supply", () => {
    expect(computeSharePercent(250n, 1000n)).toBe(25);
    expect(computeSharePercent(1n, 3n)).toBeCloseTo(33.3333, 3);
  });

  it("is zero for a zero balance or a zero/negative total supply", () => {
    expect(computeSharePercent(0n, 1000n)).toBe(0);
    expect(computeSharePercent(100n, 0n)).toBe(0);
  });
});
