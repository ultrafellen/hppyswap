// SPDX-License-Identifier: MIT
const KEY = "hppyswap.settings.v1";

export type Settings = { slippageBps: number; deadlineMinutes: number; rpcUrl: string | null };

export const DEFAULT_SETTINGS: Settings = { slippageBps: 50, deadlineMinutes: 20, rpcUrl: null };

export function loadSettings(): Settings {
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") }; }
  catch { return DEFAULT_SETTINGS; }
}

export function saveSettings(s: Settings): void {
  // localStorage.setItem throws in environments where storage is disabled or
  // unavailable (e.g. Safari private browsing, quota exceeded, SSR). Persisting
  // settings is a nice-to-have, not a hard requirement, so we swallow the error
  // and simply skip persistence for this session rather than crashing the caller.
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // no-op: settings won't persist for this session
  }
}

// wagmi.ts calls this at module-eval time (config creation), before React mounts,
// so it reads localStorage directly rather than going through the useSettings hook.
// loadSettings() already guards against localStorage being unavailable (e.g. SSR/build).
export function getStoredRpcUrl(): string | null { return loadSettings().rpcUrl; }
