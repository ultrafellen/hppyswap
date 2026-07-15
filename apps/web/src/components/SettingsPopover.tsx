// SPDX-License-Identifier: MIT
import { useState } from "react";
import { useSettings } from "../hooks/useSettings";

/**
 * Trigger + popover for slippage/deadline/RPC settings, persisted via
 * useSettings. Each field's onChange calls setSettings exactly once (never
 * batched — useSettings resolves the next value from its own closure, so
 * two calls in one handler would clobber each other).
 */
export function SettingsPopover() {
  const { settings, setSettings, resetSettings } = useSettings();
  const [open, setOpen] = useState(false);

  return (
    <div className="settings-wrap">
      <button
        type="button"
        className="settings-trigger"
        data-agent="settings-trigger"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        slippage {(settings.slippageBps / 100).toFixed(2)}% ⚙
      </button>
      {open && (
        <div className="settings-panel" role="group" aria-label="swap settings">
          <label className="settings-field">
            slippage tolerance (bps)
            <input
              type="number"
              min={0}
              max={5000}
              step={1}
              value={settings.slippageBps}
              data-agent="settings-slippage"
              onChange={(e) => {
                const next = Number(e.target.value);
                if (Number.isNaN(next)) return;
                setSettings({ ...settings, slippageBps: Math.max(0, Math.min(5000, Math.round(next))) });
              }}
            />
          </label>
          <label className="settings-field">
            deadline (minutes)
            <input
              type="number"
              min={1}
              step={1}
              value={settings.deadlineMinutes}
              data-agent="settings-deadline"
              onChange={(e) => {
                const next = Number(e.target.value);
                if (Number.isNaN(next)) return;
                setSettings({ ...settings, deadlineMinutes: Math.max(1, Math.round(next)) });
              }}
            />
          </label>
          <label className="settings-field">
            custom rpc url
            <input
              type="text"
              placeholder="https://…"
              value={settings.rpcUrl ?? ""}
              data-agent="settings-rpc"
              onChange={(e) => {
                const next = e.target.value.trim();
                setSettings({ ...settings, rpcUrl: next === "" ? null : next });
              }}
            />
          </label>
          <p className="settings-note">rpc url change requires a page reload to take effect</p>
          <button type="button" className="settings-reset" onClick={resetSettings}>
            reset to defaults
          </button>
        </div>
      )}
    </div>
  );
}
