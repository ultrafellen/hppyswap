// SPDX-License-Identifier: MIT
import type { TokenInfo } from "@hppyswap/sdk";

const KEY = "hppyswap.tokens.v1";

/** Reads the user's "imported by address" token list, defaulting to empty on missing/corrupt storage. */
export function loadCustomTokens(): TokenInfo[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TokenInfo[]) : [];
  } catch {
    return [];
  }
}

export function saveCustomTokens(tokens: TokenInfo[]): void {
  // Best-effort persistence, same rationale as config/settings.ts: storage
  // can be disabled/unavailable (Safari private mode, quota, etc.) and that
  // shouldn't crash the import flow — it just won't stick across reloads.
  try {
    localStorage.setItem(KEY, JSON.stringify(tokens));
  } catch {
    // no-op
  }
}

/** Adds (or replaces, by address) a token in the persisted custom list and returns the new list. */
export function addCustomToken(token: TokenInfo): TokenInfo[] {
  const existing = loadCustomTokens().filter(
    (t) => t.address.toLowerCase() !== token.address.toLowerCase(),
  );
  const next = [...existing, token];
  saveCustomTokens(next);
  return next;
}
