// SPDX-License-Identifier: MIT
export type StatusTone = "info" | "success" | "error";

export type StatusLineProps = {
  message: string;
  tone: StatusTone;
  /** Overrides the default `data-agent="status-line"` for page-specific selector catalogs (e.g. Task 9's `swap-status`). */
  dataAgent?: string;
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
export function StatusLine({ message, tone, dataAgent = "status-line" }: StatusLineProps) {
  return (
    <p
      role="status"
      aria-live="polite"
      data-agent={dataAgent}
      className="status-line"
      style={{ color: TONE_COLOR[tone] }}
    >
      {message}
    </p>
  );
}
