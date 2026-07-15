// SPDX-License-Identifier: MIT
import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, getStoredRpcUrl, loadSettings, saveSettings } from "../src/config/settings";

// Minimal in-memory Storage stub — this test runs under vitest's node
// environment, which has no browser localStorage, so we provide just
// enough of the Storage interface for the settings module to use.
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

describe("settings round-trip", () => {
  it("loads defaults when nothing is stored", () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("persists and reloads a saved settings object", () => {
    const next = { slippageBps: 100, deadlineMinutes: 30, rpcUrl: "https://custom.rpc" };
    saveSettings(next);
    expect(loadSettings()).toEqual(next);
    expect(getStoredRpcUrl()).toBe("https://custom.rpc");
  });

  it("falls back to defaults on corrupt storage", () => {
    localStorage.setItem("hppyswap.settings.v1", "not json");
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("merges a partial stored object with defaults", () => {
    localStorage.setItem("hppyswap.settings.v1", JSON.stringify({ slippageBps: 100 }));
    const loaded = loadSettings();
    expect(loaded.slippageBps).toBe(100);
    expect(loaded.deadlineMinutes).toBe(20);
    expect(loaded.rpcUrl).toBeNull();
  });
});
