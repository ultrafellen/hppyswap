// SPDX-License-Identifier: MIT
import { useState } from "react";
import { useAccount, useConnect, useConnectors, useDisconnect, useSwitchChain } from "wagmi";
import { hpp } from "@hppyswap/sdk";
import { truncateAddress } from "../lib/address";

/**
 * Wallet connect affordance with three states, each rendered as visible DOM
 * text (never spinner-only) so both humans and DOM-reading agents can drive
 * it: disconnected -> connector picker, connected on the wrong chain ->
 * switch prompt, connected on hpp -> truncated address + disconnect.
 */
export function ConnectButton() {
  const [expanded, setExpanded] = useState(false);
  const { address, isConnected, chainId } = useAccount();
  const connectors = useConnectors();
  const { connect, isPending: isConnecting, error: connectError } = useConnect();
  const { disconnect, isPending: isDisconnecting } = useDisconnect();
  const { switchChain, isPending: isSwitching, error: switchError } = useSwitchChain();

  if (!isConnected) {
    return (
      <div className="connect-wrap">
        <button
          type="button"
          className="connect-trigger"
          data-agent="wallet-connect"
          aria-haspopup="true"
          aria-expanded={expanded}
          onClick={() => setExpanded((open) => !open)}
        >
          connect ▾
        </button>
        {expanded && (
          <div className="connect-menu" role="menu">
            {connectors.length === 0 ? (
              <p className="connect-menu-empty">no wallet detected</p>
            ) : (
              connectors.map((connector) => (
                <button
                  key={connector.uid}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setExpanded(false);
                    connect({ connector });
                  }}
                >
                  {connector.name}
                </button>
              ))
            )}
          </div>
        )}
        {isConnecting && <p className="connect-status">connecting…</p>}
        {connectError && (
          <p role="alert" className="connect-status connect-status-error">
            {connectError.message}
          </p>
        )}
      </div>
    );
  }

  if (chainId !== hpp.id) {
    return (
      <div className="connect-wrap">
        <button
          type="button"
          className="switch-chain"
          data-agent="wallet-switch-chain"
          onClick={() => switchChain({ chainId: hpp.id })}
        >
          switch to hpp
        </button>
        {isSwitching && <p className="connect-status">switching…</p>}
        {switchError && (
          <p role="alert" className="connect-status connect-status-error">
            {switchError.message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="connect-wrap">
      <span className="connect-address">{address ? truncateAddress(address) : ""}</span>
      <button type="button" className="disconnect" data-agent="wallet-disconnect" onClick={() => disconnect()}>
        disconnect
      </button>
      {isDisconnecting && <p className="connect-status">disconnecting…</p>}
    </div>
  );
}
