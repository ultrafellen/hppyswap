// SPDX-License-Identifier: MIT
import { useEffect, useState, useSyncExternalStore } from "react";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";

// Background refetches that finish faster than this never flip the
// indicator, so it doesn't flicker on every quick read.
const SHOW_AFTER_MS = 300;
// Past this, the label switches to "rpc slow" so a long wait reads as the
// network being slow rather than the page being stuck.
const SLOW_AFTER_MS = 4000;

// Transport-level failures only — a contract revert (e.g. importing a
// non-ERC20 address) is a query error too, but says nothing about the RPC.
const TRANSPORT_ERROR_RE = /HttpRequestError|TimeoutError|RpcRequestError|LimitExceededRpcError|InternalRpcError/;

function isTransportError(e: unknown, depth = 0): boolean {
  if (e == null || typeof e !== "object" || depth > 6) return false;
  const name = (e as { name?: unknown }).name;
  if (typeof name === "string" && TRANSPORT_ERROR_RE.test(name)) return true;
  return isTransportError((e as { cause?: unknown }).cause, depth + 1);
}

/** Whether any settled query last failed because the RPC itself failed. */
function useRpcFailing(): boolean {
  const cache = useQueryClient().getQueryCache();
  return useSyncExternalStore(
    (onChange) => cache.subscribe(onChange),
    () => cache.getAll().some((q) => q.state.status === "error" && isTransportError(q.state.error)),
  );
}

/**
 * Header pill showing HPP Mainnet RPC activity: idle ("hpp mainnet"),
 * loading ("loading rpc… 2s"), slow, or error. Driven by react-query's
 * global fetching count, which every wagmi read goes through, so it covers
 * quotes, balances, pools and receipts without per-call wiring. Visible
 * text, not color alone, so DOM-reading agents and screen readers get it.
 */
export function RpcIndicator() {
  const fetching = useIsFetching() > 0;
  const hasError = useRpcFailing();
  const [since, setSince] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!fetching) {
      setSince(null);
      return;
    }
    const start = Date.now();
    setSince(start);
    setNow(start);
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [fetching]);

  const elapsed = since != null ? now - since : 0;
  const showLoading = fetching && elapsed >= SHOW_AFTER_MS;

  let state: "idle" | "loading" | "slow" | "error" = "idle";
  if (showLoading) state = elapsed >= SLOW_AFTER_MS ? "slow" : "loading";
  else if (hasError) state = "error";

  const seconds = Math.floor(elapsed / 1000);
  const label =
    state === "loading"
      ? `loading rpc…${seconds >= 1 ? ` ${seconds}s` : ""}`
      : state === "slow"
        ? `rpc slow… ${seconds}s`
        : state === "error"
          ? "rpc error"
          : "hpp mainnet";

  return (
    <span
      className={`rpc-indicator rpc-indicator-${state}`}
      data-agent="rpc-status"
      data-state={state}
      aria-busy={state === "loading" || state === "slow"}
      title={
        state === "error"
          ? "HPP Mainnet RPC requests are failing. Reads retry on the next refresh; a custom RPC URL can be set in settings."
          : "HPP Mainnet RPC status"
      }
    >
      <span className="rpc-dot" aria-hidden="true" />
      {label}
    </span>
  );
}
