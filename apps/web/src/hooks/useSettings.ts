// SPDX-License-Identifier: MIT
import { useCallback, useSyncExternalStore } from "react";
import { getSnapshot, resetSettingsStore, setSettingsStore, subscribe } from "../config/settingsStore";
import type { Settings } from "../config/settings";

export type { Settings };

export type UseSettingsReturn = {
  settings: Settings;
  setSettings: (next: Settings | ((prev: Settings) => Settings)) => void;
  resetSettings: () => void;
};

/**
 * React-facing wrapper around the module-level settings store
 * (config/settingsStore.ts). Every component that calls useSettings()
 * subscribes to the same underlying value via useSyncExternalStore, so a
 * change made in one place (e.g. SettingsPopover) is immediately visible
 * everywhere else settings are read (e.g. useSwap, useLiquidity) — no
 * separate per-instance copy, no waiting for a remount.
 */
export function useSettings(): UseSettingsReturn {
  const settings = useSyncExternalStore(subscribe, getSnapshot);

  const setSettings = useCallback((next: Settings | ((prev: Settings) => Settings)) => {
    setSettingsStore(next);
  }, []);

  const resetSettings = useCallback(() => {
    resetSettingsStore();
  }, []);

  return { settings, setSettings, resetSettings };
}
