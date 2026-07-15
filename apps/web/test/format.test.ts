// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";
import { formatAmount, parseAmount } from "../src/lib/format";

it("formats with grouping and trimmed decimals", () => {
  expect(formatAmount(3842113000000000000000n, 18, 4)).toBe("3,842.113");
  expect(formatAmount(0n, 18)).toBe("0");
});
it("parses decimal text to bigint", () => {
  expect(parseAmount("1.5", 18)).toBe(1500000000000000000n);
  expect(parseAmount("abc", 18)).toBeNull();
  expect(parseAmount("", 18)).toBeNull();
});
