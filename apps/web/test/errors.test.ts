import { expect, it } from "vitest";
import { humanizeError } from "../src/lib/errors";

it("maps user rejection", () => {
  expect(humanizeError({ name: "UserRejectedRequestError" })).toBe("transaction rejected in wallet");
});
it("maps slippage revert", () => {
  expect(humanizeError(new Error("UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT")))
    .toBe("price moved beyond slippage tolerance — try again or raise slippage");
});
it("falls back to generic message", () => {
  expect(humanizeError(new Error("boom"))).toBe("transaction failed — see console for details");
});
