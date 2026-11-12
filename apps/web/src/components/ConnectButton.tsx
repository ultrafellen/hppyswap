// SPDX-License-Identifier: MIT
import { useEffect, useRef, useState } from "react";
import { useConnect, useConnection, useConnectors, useDisconnect, useSwitchChain, type Connector } from "wagmi";
import { hpp } from "@hppyswap/sdk";
import { truncateAddress } from "../lib/address";
import { humanizeError, isUserRejection } from "../lib/errors";

// Shown when no EIP-6963 wallet announced itself. Plain text links — no
// hand-drawn brand logos; the icons in the picker come from the wallets
// themselves (EIP-6963 `info.icon`), which is the only authoritative source.
const INSTALL_LINKS: ReadonlyArray<{ name: string; href: string }> = [
  { name: "MetaMask", href: "https://metamask.io/download/" },
  { name: "Rabby", href: "https://rabby.io/" },
  { name: "Coinbase Wallet", href: "https://www.coinbase.com/wallet/downloads" },
];

// Mobile browsers have no extension wallets; these open the current page
// inside the wallet app's own dapp browser instead.
function mobileDeepLinks(): ReadonlyArray<{ name: string; href: string }> {
  const url = window.location.href;
  const hostAndPath = url.replace(/^https?:\/\//, "");
  return [
    { name: "open in MetaMask", href: `https://metamask.app.link/dapp/${hostAndPath}` },
    { name: "open in Coinbase Wallet", href: `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(url)}` },
  ];
}

function isMobileBrowser(): boolean {
  return typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/**
 * EIP-6963 icons are data URIs supplied by the wallet extension. Rendered
 * only through <img> (which never executes script, even for SVG) and only
 * when it is actually an image data URI or https URL.
 */
function WalletIcon({ connector }: { connector: Pick<Connector, "icon" | "name"> | undefined }) {
  const icon = connector?.icon?.trim();
  if (icon && /^(data:image\/|https:\/\/)/.test(icon)) {
    return <img className="wallet-icon" src={icon} alt="" aria-hidden="true" width={20} height={20} />;
  }
  return (
    <span className="wallet-icon wallet-icon-fallback" aria-hidden="true">
      {(connector?.name ?? "?").charAt(0).toUpperCase()}
    </span>
  );
}

function connectErrorMessage(e: unknown): string {
  if (isUserRejection(e)) return "connection request rejected in wallet";
  return humanizeError(e, "could not connect — unlock your wallet and try again");
}

/**
 * Wallet connect affordance with three states, each rendered as visible DOM
 * text (never spinner-only) so both humans and DOM-reading agents can drive
 * it: disconnected -> connector picker (with each wallet's own icon),
 * connected on the wrong chain -> switch prompt, connected on hpp ->
 * wallet icon + truncated address + disconnect.
 */
export function ConnectButton() {
  const [expanded, setExpanded] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { address, isConnected, chainId, connector: activeConnector, status } = useConnection();
  const connectors = useConnectors();
  const {
    mutate: connect,
    isPending: isConnecting,
    error: connectError,
    variables,
    reset: resetConnect,
  } = useConnect();
  const { mutate: disconnect, isPending: isDisconnecting, error: disconnectError } = useDisconnect();
  const { mutate: switchChain, isPending: isSwitching, error: switchError } = useSwitchChain();

  // Close the picker on outside click or Escape (returning focus to the trigger).
  useEffect(() => {
    if (!expanded) return;
    function onPointerDown(e: PointerEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setExpanded(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setExpanded(false);
      wrapRef.current?.querySelector<HTMLButtonElement>(".connect-trigger")?.focus();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [expanded]);

  if (!isConnected) {
    const reconnecting = status === "reconnecting" || status === "connecting";
    const busy = isConnecting || reconnecting;
    // `variables.connector` is a Connector instance here (we always pass one
    // from useConnectors), but its type also admits a connector factory.
    const pendingConnector = isConnecting ? variables?.connector : undefined;
    const pendingName = pendingConnector && "name" in pendingConnector ? pendingConnector.name : null;
    return (
      <div className="connect-wrap" ref={wrapRef}>
        <button
          type="button"
          className="connect-trigger"
          data-agent="wallet-connect"
          aria-haspopup="true"
          aria-expanded={expanded}
          aria-busy={busy}
          disabled={busy}
          onClick={() => {
            resetConnect();
            setExpanded((open) => !open);
          }}
        >
          {busy && <span className="spinner" aria-hidden="true" />}
          {isConnecting ? "connecting…" : reconnecting ? "reconnecting…" : "connect ▾"}
        </button>
        {expanded && (
          <div className="connect-menu" role="menu" aria-label="choose a wallet">
            {connectors.length === 0 ? (
              <div className="connect-menu-empty">
                <p>no wallet detected</p>
                <ul className="connect-install-list">
                  {(isMobileBrowser() ? mobileDeepLinks() : INSTALL_LINKS).map((link) => (
                    <li key={link.name}>
                      <a href={link.href} target="_blank" rel="noreferrer noopener" data-agent="wallet-install">
                        {isMobileBrowser() ? link.name : `get ${link.name} ↗`}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              connectors.map((connector) => (
                <button
                  key={connector.uid}
                  type="button"
                  role="menuitem"
                  className="connect-option"
                  data-agent="wallet-option"
                  onClick={() => {
                    setExpanded(false);
                    connect({ connector, chainId: hpp.id });
                  }}
                >
                  <WalletIcon connector={connector} />
                  <span>{connector.name}</span>
                </button>
              ))
            )}
          </div>
        )}
        <div className="connect-status-stack">
          {isConnecting && (
            <p className="connect-status">
              {pendingName ? `approve the request in ${pendingName}…` : "approve the request in your wallet…"}
            </p>
          )}
          {connectError && !isConnecting && (
            <p role="alert" className="connect-status connect-status-error">
              {connectErrorMessage(connectError)}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (chainId != null && chainId !== hpp.id) {
    return (
      <div className="connect-wrap">
        <button
          type="button"
          className="switch-chain"
          data-agent="wallet-switch-chain"
          title="Your wallet is on another network. HPPYSwap runs on HPP Mainnet (chainId 190415)."
          disabled={isSwitching}
          aria-busy={isSwitching}
          onClick={() => switchChain({ chainId: hpp.id })}
        >
          {isSwitching && <span className="spinner" aria-hidden="true" />}
          {isSwitching ? "switching…" : "switch to hpp"}
        </button>
        <button type="button" className="disconnect" data-agent="wallet-disconnect" onClick={() => disconnect()}>
          disconnect
        </button>
        <div className="connect-status-stack">
          {switchError && !isSwitching && (
            <p role="alert" className="connect-status connect-status-error">
              {isUserRejection(switchError)
                ? "network switch rejected in wallet"
                : humanizeError(switchError, "could not switch — add HPP Mainnet in your wallet and retry")}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="connect-wrap">
      <span className="connect-address" title={address}>
        <WalletIcon connector={activeConnector} />
        {address ? truncateAddress(address) : ""}
      </span>
      <button
        type="button"
        className="disconnect"
        data-agent="wallet-disconnect"
        disabled={isDisconnecting}
        onClick={() => disconnect()}
      >
        {isDisconnecting ? "disconnecting…" : "disconnect"}
      </button>
      {disconnectError && (
        <div className="connect-status-stack">
          <p role="alert" className="connect-status connect-status-error">
            {humanizeError(disconnectError, "could not disconnect — try again")}
          </p>
        </div>
      )}
    </div>
  );
}
