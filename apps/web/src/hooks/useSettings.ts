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
    setSettingsState((prev) => {
      const resolved = typeof next === "function" ? (next as (prev: Settings) => Settings)(prev) : next;
      saveSettings(resolved);
      return resolved;
    });
  }, []);

  const resetSettings = useCallback(() => {
    saveSettings(DEFAULT_SETTINGS);
    setSettingsState(DEFAULT_SETTINGS);
  }, []);

  return { settings, setSettings, resetSettings };
}
