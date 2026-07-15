// SPDX-License-Identifier: MIT
import { beforeEach, describe, expect, it } from "vitest";
import { applyTheme, persistTheme, readStoredTheme, toggleTheme } from "../src/lib/theme";

// Minimal in-memory Storage stub — this test runs under vitest's node
// environment, which has no browser localStorage, so we provide just
// enough of the Storage interface for the theme module to use.
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

describe("readStoredTheme / persistTheme round-trip", () => {
  it("defaults to dark when nothing is stored", () => {
    expect(readStoredTheme()).toBe("dark");
  });

  it("persists and reloads a light theme", () => {
    persistTheme("light");
    expect(readStoredTheme()).toBe("light");
  });

  it("persists and reloads a dark theme", () => {
    persistTheme("light");
    persistTheme("dark");
    expect(readStoredTheme()).toBe("dark");
  });

  it("falls back to dark for any unrecognized stored value", () => {
    localStorage.setItem("hppyswap.theme", "purple");
    expect(readStoredTheme()).toBe("dark");
  });
});

describe("toggleTheme", () => {
  it("flips dark to light and back", () => {
    expect(toggleTheme("dark")).toBe("light");
    expect(toggleTheme("light")).toBe("dark");
  });
});

describe("applyTheme", () => {
  it("sets dataset.theme to light", () => {
    const root: { dataset: DOMStringMap } = { dataset: {} };
    applyTheme("light", root);
    expect(root.dataset.theme).toBe("light");
  });

  it("removes dataset.theme for dark", () => {
    const root: { dataset: DOMStringMap } = { dataset: { theme: "light" } };
    applyTheme("dark", root);
    expect(root.dataset.theme).toBeUndefined();
  });
});
