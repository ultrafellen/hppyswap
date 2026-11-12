// SPDX-License-Identifier: MIT
import { expect, it } from "vitest";
import { humanizeError, isUserRejection } from "../src/lib/errors";

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
it("maps a chain mismatch (wallet on another network) to a switch hint", () => {
  const e = { name: "ContractFunctionExecutionError", cause: { name: "ChainMismatchError", message: "The current chain of the wallet (id: 1) does not match the target chain for the transaction (id: 190415 – HPP Mainnet)." } };
  expect(humanizeError(e)).toBe("wallet is on the wrong network — switch to HPP Mainnet");
});
it("maps an already-open wallet request", () => {
  expect(humanizeError({ name: "ResourceUnavailableRpcError" })).toBe("a wallet request is already open — check your wallet");
});
it("uses the caller's fallback for unknown errors", () => {
  expect(humanizeError(new Error("boom"), "could not connect")).toBe("could not connect");
});
it("detects user rejection through the cause chain", () => {
  expect(isUserRejection({ name: "ConnectorError", cause: { message: "User rejected the request." } })).toBe(true);
  expect(isUserRejection(new Error("boom"))).toBe(false);
});
