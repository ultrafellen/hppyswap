// SPDX-License-Identifier: MIT
import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, getStoredRpcUrl, loadSettings, saveSettings } from "../src/config/settings";
import { getSnapshot, resetSettingsStore, setSettingsStore, subscribe } from "../src/config/settingsStore";

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

describe("settings validation", () => {
  it("clamps an out-of-range slippageBps into [0, 5000]", () => {
    localStorage.setItem("hppyswap.settings.v1", JSON.stringify({ slippageBps: 9999 }));
    expect(loadSettings().slippageBps).toBe(5000);

    localStorage.setItem("hppyswap.settings.v1", JSON.stringify({ slippageBps: -10 }));
    expect(loadSettings().slippageBps).toBe(0);
  });

  it("falls back to the default slippageBps for a non-integer or wrong-typed value", () => {
    localStorage.setItem("hppyswap.settings.v1", JSON.stringify({ slippageBps: "abc" }));
    expect(loadSettings().slippageBps).toBe(DEFAULT_SETTINGS.slippageBps);

    localStorage.setItem("hppyswap.settings.v1", JSON.stringify({ slippageBps: 12.5 }));
    expect(loadSettings().slippageBps).toBe(DEFAULT_SETTINGS.slippageBps);
  });

  it("clamps an out-of-range deadlineMinutes into [1, 4320]", () => {
    localStorage.setItem("hppyswap.settings.v1", JSON.stringify({ deadlineMinutes: 999999 }));
    expect(loadSettings().deadlineMinutes).toBe(4320);

    localStorage.setItem("hppyswap.settings.v1", JSON.stringify({ deadlineMinutes: 0 }));
    expect(loadSettings().deadlineMinutes).toBe(1);
  });

  it("falls back to the default deadlineMinutes for a non-integer or wrong-typed value", () => {
    localStorage.setItem("hppyswap.settings.v1", JSON.stringify({ deadlineMinutes: "soon" }));
    expect(loadSettings().deadlineMinutes).toBe(DEFAULT_SETTINGS.deadlineMinutes);
  });

  it("rejects an rpcUrl that isn't a non-empty http(s):// string", () => {
    localStorage.setItem("hppyswap.settings.v1", JSON.stringify({ rpcUrl: "not-a-url" }));
    expect(loadSettings().rpcUrl).toBeNull();

    localStorage.setItem("hppyswap.settings.v1", JSON.stringify({ rpcUrl: "" }));
    expect(loadSettings().rpcUrl).toBeNull();

    localStorage.setItem("hppyswap.settings.v1", JSON.stringify({ rpcUrl: 12345 }));
    expect(loadSettings().rpcUrl).toBeNull();
  });

  it("accepts a valid http(s) rpcUrl", () => {
    localStorage.setItem("hppyswap.settings.v1", JSON.stringify({ rpcUrl: "http://localhost:8545" }));
    expect(loadSettings().rpcUrl).toBe("http://localhost:8545");

    localStorage.setItem("hppyswap.settings.v1", JSON.stringify({ rpcUrl: "https://custom.rpc" }));
    expect(loadSettings().rpcUrl).toBe("https://custom.rpc");
  });
});

describe("settings store", () => {
  beforeEach(() => {
    resetSettingsStore();
  });

  it("gives two independent subscribers the same value after setSettingsStore", () => {
    let seenByA: ReturnType<typeof getSnapshot> | null = null;
    let seenByB: ReturnType<typeof getSnapshot> | null = null;
    const unsubA = subscribe(() => { seenByA = getSnapshot(); });
    const unsubB = subscribe(() => { seenByB = getSnapshot(); });

    setSettingsStore({ slippageBps: 200, deadlineMinutes: 15, rpcUrl: null });

    expect(seenByA).toEqual({ slippageBps: 200, deadlineMinutes: 15, rpcUrl: null });
    expect(seenByB).toEqual({ slippageBps: 200, deadlineMinutes: 15, rpcUrl: null });
    expect(getSnapshot()).toEqual({ slippageBps: 200, deadlineMinutes: 15, rpcUrl: null });

    unsubA();
    unsubB();
  });

  it("stops notifying a subscriber after it unsubscribes", () => {
    let notifications = 0;
    const unsubscribe = subscribe(() => { notifications += 1; });
    unsubscribe();

    setSettingsStore({ slippageBps: 123, deadlineMinutes: 5, rpcUrl: null });

    expect(notifications).toBe(0);
  });

  it("resolves a functional update against the store's current value, not a stale closure", () => {
    // Two functional updates issued back to back (e.g. two edits dispatched
    // in the same tick) must both apply — this is exactly the stale-closure
    // hazard the old per-instance useState implementation had.
    setSettingsStore((prev) => ({ ...prev, slippageBps: prev.slippageBps + 10 }));
    setSettingsStore((prev) => ({ ...prev, slippageBps: prev.slippageBps + 10 }));

    expect(getSnapshot().slippageBps).toBe(DEFAULT_SETTINGS.slippageBps + 20);
  });

  it("resetSettingsStore restores defaults and notifies subscribers", () => {
    setSettingsStore({ slippageBps: 999, deadlineMinutes: 999, rpcUrl: "https://x" });
    let notified = false;
    const unsubscribe = subscribe(() => { notified = true; });

    resetSettingsStore();

    expect(getSnapshot()).toEqual(DEFAULT_SETTINGS);
    expect(notified).toBe(true);
    unsubscribe();
  });
});
