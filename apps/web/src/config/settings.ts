// SPDX-License-Identifier: MIT
const KEY = "hppyswap.settings.v1";

export type Settings = { slippageBps: number; deadlineMinutes: number; rpcUrl: string | null };

export const DEFAULT_SETTINGS: Settings = { slippageBps: 50, deadlineMinutes: 20, rpcUrl: null };

const MAX_SLIPPAGE_BPS = 5000;
const MIN_DEADLINE_MINUTES = 1;
const MAX_DEADLINE_MINUTES = 4320; // 3 days

// A hand-edited (or stale-schema) localStorage entry can contain anything —
// wrong types, out-of-range numbers, or a garbage rpcUrl. Every field is
// validated independently so one bad field doesn't discard the rest, and so
// a bad value can never reach call sites that assume it's safe (e.g.
// `BigInt(... + settings.deadlineMinutes * 60)` in useSwap, which throws on
// a non-finite/non-integer input).
function sanitizeSlippageBps(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value)) return DEFAULT_SETTINGS.slippageBps;
  return Math.min(MAX_SLIPPAGE_BPS, Math.max(0, value));
}

function sanitizeDeadlineMinutes(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value)) return DEFAULT_SETTINGS.deadlineMinutes;
  return Math.min(MAX_DEADLINE_MINUTES, Math.max(MIN_DEADLINE_MINUTES, value));
}

function sanitizeRpcUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  return /^https?:\/\//.test(value) ? value : null;
}

function sanitizeSettings(raw: unknown): Settings {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    slippageBps: sanitizeSlippageBps(obj.slippageBps),
    deadlineMinutes: sanitizeDeadlineMinutes(obj.deadlineMinutes),
    rpcUrl: sanitizeRpcUrl(obj.rpcUrl),
  };
}

export function loadSettings(): Settings {
  try { return sanitizeSettings(JSON.parse(localStorage.getItem(KEY) ?? "{}")); }
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
