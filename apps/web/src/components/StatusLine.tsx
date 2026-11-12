// SPDX-License-Identifier: MIT
import { useEffect, useState } from "react";

export type StatusTone = "info" | "success" | "error";

export type StatusLineProps = {
  message: string;
  tone: StatusTone;
  /** Overrides the default `data-agent="status-line"` for page-specific selector catalogs (e.g. Task 9's `swap-status`). */
  dataAgent?: string;
  /**
   * Marks a wait on the network (approval/tx confirmation, initial loads):
   * adds a spinner and an elapsed-seconds counter so a slow HPP block
   * (~11s on average) reads as progress rather than a hang.
   */
  busy?: boolean;
};

const TONE_COLOR: Record<StatusTone, string> = {
  info: "var(--text-dim)",
  success: "var(--accent)",
  error: "var(--danger)",
};

/**
 * A single-line, always-mounted status announcer. Consumers (Tasks 9-11)
 * pass the current message/tone in; when message is empty the aria-live
 * region is present but visually empty, so it stays available to screen
 * readers and DOM-driven agents without occupying visual attention.
 */
export function StatusLine({ message, tone, dataAgent = "status-line", busy = false }: StatusLineProps) {
  const seconds = useElapsedSeconds(busy, message);
  return (
    <p
      role="status"
      aria-live="polite"
      aria-busy={busy}
      data-agent={dataAgent}
      className="status-line"
      style={{ color: TONE_COLOR[tone] }}
    >
      {busy && message && <span className="spinner" aria-hidden="true" />}
      {message}
      {/* aria-hidden: the ticking counter would otherwise be re-announced
          by the live region every second. */}
      {busy && message && seconds >= 2 && (
        <span className="status-elapsed" aria-hidden="true">
          {" "}
          · {seconds}s
        </span>
      )}
    </p>
  );
}

/** Seconds since `busy` became true (restarting whenever `key` changes). */
function useElapsedSeconds(busy: boolean, key: string): number {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    setSeconds(0);
    if (!busy) return;
    const start = Date.now();
    const id = window.setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 500);
    return () => window.clearInterval(id);
  }, [busy, key]);
  return seconds;
}
