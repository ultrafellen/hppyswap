// SPDX-License-Identifier: MIT
import { useCallback, useState } from "react";
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from "../config/settings";
import type { Settings } from "../config/settings";

export type { Settings };

export type UseSettingsReturn = {
  settings: Settings;
  setSettings: (next: Settings | ((prev: Settings) => Settings)) => void;
  resetSettings: () => void;
};

/**
 * React-facing wrapper around the localStorage-backed settings module.
 * Reads once on mount and persists every update.
 */
export function useSettings(): UseSettingsReturn {
  const [settings, setSettingsState] = useState<Settings>(() => loadSettings());

  const setSettings = useCallback((next: Settings | ((prev: Settings) => Settings)) => {
    // Resolve the next value and persist it outside the state updater. The
    // updater passed to setState can be invoked more than once per update
    // (e.g. React StrictMode's double-invoke in development), so any side
    // effect like saveSettings must not live inside it.
    const resolved = typeof next === "function" ? (next as (prev: Settings) => Settings)(settings) : next;
    saveSettings(resolved);
    setSettingsState(resolved);
  }, [settings]);

  const resetSettings = useCallback(() => {
    saveSettings(DEFAULT_SETTINGS);
    setSettingsState(DEFAULT_SETTINGS);
  }, []);

  return { settings, setSettings, resetSettings };
}
