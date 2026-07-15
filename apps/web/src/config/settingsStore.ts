// SPDX-License-Identifier: MIT
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from "./settings";
import type { Settings } from "./settings";

/**
 * Module-level store backing useSettings (hooks/useSettings.ts).
 *
 * useSettings used to be a plain `useState` in each component that called
 * it, so SettingsPopover and useSwap/useLiquidity each held their own
 * independent copy of `settings` — changing slippage in the popover never
 * reached the hook instance useSwap read from, since they were different
 * React state cells that both happened to read the same localStorage key
 * only at mount time. Hoisting the state to a single module-level value
 * that every `useSettings()` call subscribes to (via useSyncExternalStore)
 * makes every consumer see the same value, updated synchronously.
 */

type Listener = () => void;

let state: Settings = loadSettings();
const listeners = new Set<Listener>();

export function getSnapshot(): Settings {
  return state;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Resolves `next` against the store's current value — never a value
 * captured in a render closure — so two functional updates issued back to
 * back (e.g. two field edits dispatched in the same tick) both apply
 * instead of the second clobbering the first.
 */
export function setSettingsStore(next: Settings | ((prev: Settings) => Settings)): void {
  const resolved = typeof next === "function" ? (next as (prev: Settings) => Settings)(state) : next;
  state = resolved;
  saveSettings(state);
  for (const listener of listeners) listener();
}

export function resetSettingsStore(): void {
  setSettingsStore(DEFAULT_SETTINGS);
}
