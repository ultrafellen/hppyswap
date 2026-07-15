// SPDX-License-Identifier: MIT
// Maps viem/wagmi errors (and raw contract revert strings) to short, lower-
// case, human-readable copy for the swap-status aria-live region. Matching
// is done on substrings pulled from name/message/shortMessage/details across
// the whole `cause` chain, since viem wraps the original revert reason many
// layers deep (ContractFunctionExecutionError -> ContractFunctionRevertedError
// -> ... -> the raw "UniswapV2Router: ..." string).

const SUBSTRING_MAP: ReadonlyArray<readonly [string, string]> = [
  ["INSUFFICIENT_OUTPUT_AMOUNT", "price moved beyond slippage tolerance — try again or raise slippage"],
  ["INSUFFICIENT_INPUT_AMOUNT", "price moved beyond slippage tolerance — try again or raise slippage"],
  ["INSUFFICIENT_LIQUIDITY", "not enough liquidity in this pool for this trade"],
  ["EXPIRED", "transaction deadline expired — try again"],
  ["TransferHelper: TRANSFER_FROM_FAILED", "token transfer failed — check your token balance and allowance"],
  ["approval transaction reverted", "token approval failed — try again"],
  ["insufficient funds", "insufficient funds for this transaction"],
];

function collectStrings(e: unknown, seen: Set<unknown> = new Set()): string[] {
  if (e == null || typeof e !== "object" || seen.has(e)) return [];
  seen.add(e);

  const record = e as Record<string, unknown>;
  const strings: string[] = [];
  for (const key of ["name", "message", "shortMessage", "details"] as const) {
    const val = record[key];
    if (typeof val === "string") strings.push(val);
  }
  if ("cause" in record) strings.push(...collectStrings(record.cause, seen));
  return strings;
}

/** Turns any thrown value from the swap flow into a user-facing sentence. */
export function humanizeError(e: unknown): string {
  const strings = collectStrings(e);

  if (strings.some((s) => s === "UserRejectedRequestError" || /user rejected/i.test(s))) {
    return "transaction rejected in wallet";
  }

  const haystack = strings.join("\n");
  for (const [needle, message] of SUBSTRING_MAP) {
    if (haystack.includes(needle)) return message;
  }

  return "transaction failed — see console for details";
}
