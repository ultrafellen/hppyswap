// SPDX-License-Identifier: MIT
export type Theme = "dark" | "light";

const STORAGE_KEY = "hppyswap.theme";

/**
 * Reads the persisted theme preference. Dark is the default whenever nothing
 * has been stored yet, the stored value is unrecognized, or storage itself is
 * unavailable (e.g. disabled/blocked localStorage).
 */
export function readStoredTheme(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

/**
 * Persists the theme preference. Silently no-ops if storage is unavailable —
 * theme selection is a nice-to-have, not a hard requirement.
 */
export function persistTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // no-op: theme won't persist for this session
  }
}

/**
 * Applies a theme to a root element's dataset, matching the CSS
 * `:root[data-theme="light"]` selector defined in theme.css. Defaults to the
 * real document root so callers in the app don't need to thread it through;
 * tests pass an explicit stand-in object instead.
 */
export function applyTheme(theme: Theme, root: Pick<HTMLElement, "dataset"> = document.documentElement): void {
  if (theme === "light") {
    root.dataset.theme = "light";
  } else {
    delete root.dataset.theme;
  }
}

/** Flips dark <-> light. */
export function toggleTheme(current: Theme): Theme {
  return current === "light" ? "dark" : "light";
}
