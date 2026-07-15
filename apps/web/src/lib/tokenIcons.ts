// SPDX-License-Identifier: MIT
import type { Address } from "viem";
import { DEFAULT_TOKENS } from "@hppyswap/sdk";

/**
 * Address -> logoURI lookup for the pools pages (Task 18), which only have
 * a `TokenMeta` (address/symbol/decimals fetched live from the pair's
 * ERC20s) rather than the full `TokenInfo` DEFAULT_TOKENS carries a
 * `logoURI` on. Matches case-insensitively since on-chain addresses come
 * back checksummed inconsistently across call sites. Any token outside
 * DEFAULT_TOKENS (an arbitrary pool's tokens) has no known icon — callers
 * fall back to TokenIcon's lettered circle.
 */
const LOGO_BY_ADDRESS = new Map<string, string>(
  DEFAULT_TOKENS.filter((t) => t.logoURI).map((t) => [t.address.toLowerCase(), t.logoURI as string]),
);

export function resolveTokenLogo(address: Address): string | undefined {
  return LOGO_BY_ADDRESS.get(address.toLowerCase());
}
