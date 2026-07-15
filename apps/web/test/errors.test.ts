// SPDX-License-Identifier: MIT
import { expect, it } from "vitest";
import { humanizeError } from "../src/lib/errors";

it("maps user rejection", () => {
  expect(humanizeError({ name: "UserRejectedRequestError" })).toBe("transaction rejected in wallet");
});
it("maps slippage revert", () => {
  expect(humanizeError(new Error("UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT")))
    .toBe("price moved beyond slippage tolerance — try again or raise slippage");
});
it("maps approval revert", () => {
  expect(humanizeError(new Error("approval transaction reverted")))
    .toBe("token approval failed — try again");
});
it("falls back to generic message", () => {
  expect(humanizeError(new Error("boom"))).toBe("transaction failed — see console for details");
});
