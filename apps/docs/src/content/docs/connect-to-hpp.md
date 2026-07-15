---
title: Connect to HPP Mainnet
description: Add HPP Mainnet to your wallet.
---

HPPYSwap runs on a single chain: **HPP Mainnet**. There is no testnet
deployment and no network switcher in the app beyond a prompt to switch to
HPP if your wallet is on the wrong chain.

## Network details

| Field | Value |
|---|---|
| Chain name | HPP Mainnet |
| Chain ID | `190415` |
| Currency symbol | ETH (18 decimals) |
| RPC URL | `https://mainnet.hpp.io` |
| WebSocket RPC | `wss://mainnet.hpp.io` |
| Block explorer | `https://explorer.hpp.io` |

## Add it manually

Most injected wallets (MetaMask and other EIP-6963 wallets) let you add a
custom network by hand:

1. Open your wallet's network settings and choose **Add network** /
   **Add network manually**.
2. Enter the values from the table above — network name `HPP Mainnet`,
   chain ID `190415`, RPC URL `https://mainnet.hpp.io`, currency symbol
   `ETH`, block explorer URL `https://explorer.hpp.io`.
3. Save, then switch to the new network.

## Let the app do it for you

If your wallet is connected to HPPYSwap but on a different chain, the wallet
button in the top-right of the app switches to a **switch to hpp** prompt
(`data-agent="wallet-switch-chain"`). Clicking it calls your wallet's
`wallet_switchEthereumChain` (falling back to `wallet_addEthereumChain` if
the wallet doesn't know about HPP Mainnet yet) — no manual entry required.

## Public RPC rate limits

`https://mainnet.hpp.io` is a shared public endpoint and may rate-limit
heavy usage. HPPYSwap batches its read calls via Multicall3
(`0xcA11bde05977b3631167028862bE2a173976CA11`) to minimize round trips, and
the app's settings panel (⚙, `data-agent="settings-rpc"`) lets you override
the RPC URL with your own endpoint if you run into limits. A custom RPC URL
change requires a page reload to take effect.
