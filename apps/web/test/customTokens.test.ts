// SPDX-License-Identifier: MIT
import { beforeEach, describe, expect, it } from "vitest";
import { addCustomToken, loadCustomTokens, saveCustomTokens } from "../src/lib/customTokens";
import type { TokenInfo } from "@hppyswap/sdk";
import type { Address } from "viem";

// Minimal in-memory Storage stub — same pattern as test/settings.test.ts and
// test/theme.test.ts (vitest runs under Node, which has no localStorage).
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() { return this.store.size; }
  clear() { this.store.clear(); }
  getItem(key: string) { return this.store.has(key) ? this.store.get(key)! : null; }
  key(index: number) { return Array.from(this.store.keys())[index] ?? null; }
  removeItem(key: string) { this.store.delete(key); }
  setItem(key: string, value: string) { this.store.set(key, value); }
}

beforeEach(() => {
  globalThis.localStorage = new MemoryStorage();
});

const HPP: TokenInfo = {
  address: "0x1111111111111111111111111111111111111111",
  symbol: "HPP",
  name: "Hppy Token",
  decimals: 18,
};

describe("custom token list round-trip", () => {
  it("defaults to an empty list when nothing is stored", () => {
    expect(loadCustomTokens()).toEqual([]);
  });

  it("persists and reloads a saved list", () => {
    saveCustomTokens([HPP]);
    expect(loadCustomTokens()).toEqual([HPP]);
  });

  it("falls back to an empty list on corrupt storage", () => {
    localStorage.setItem("hppyswap.tokens.v1", "not json");
    expect(loadCustomTokens()).toEqual([]);
  });

  it("adds a token and de-duplicates by address (case-insensitive, last write wins)", () => {
    addCustomToken(HPP);
    const renamed = { ...HPP, address: HPP.address.toUpperCase() as Address, symbol: "HPP2" };
    const next = addCustomToken(renamed);
    expect(next).toHaveLength(1);
    expect(next[0].symbol).toBe("HPP2");
  });
});
