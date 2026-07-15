---
title: On-chain integration
description: Call the HPPYSwap router directly with viem — quote, approve, swap, with the same slippage and deadline conventions the web app uses.
---

This is the direct-contract-call path from [Agents overview](/agents/overview/):
no browser, just a signer and an RPC connection. The examples below use
[viem](https://viem.sh/) and `@hppyswap/sdk`, mirroring exactly what the
web app's `useSwap` hook does internally — an agent following this pattern
will behave identically to a human clicking through the UI.

## Before you start: check deployment status

Contract addresses are zero until HPPYSwap is deployed on HPP Mainnet.
Always check `isDeployed()` (or the manifest's `"deployed"` field) before
attempting any of the calls below:

```ts
import { isDeployed, ADDRESSES } from "@hppyswap/sdk";

if (!isDeployed()) {
  throw new Error("HPPYSwap is not deployed on HPP Mainnet yet");
}
// ADDRESSES.factory / ADDRESSES.router / ADDRESSES.weth are now real addresses
```

An agent without access to `@hppyswap/sdk` can get the same information
from the [agent manifest](/agents/hppyswap.json) (`deployed`, `contracts`,
`chain` fields) instead.

## 1. Define the chain and clients

```ts
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hpp, ADDRESSES, routerAbi, erc20Abi, applySlippage } from "@hppyswap/sdk";

// Or define it by hand from the manifest's `chain` object if you don't
// depend on @hppyswap/sdk:
//   { id: 190415, rpc: "https://mainnet.hpp.io", ... }

const account = privateKeyToAccount("0x…");

const publicClient = createPublicClient({ chain: hpp, transport: http() });
const walletClient = createWalletClient({ account, chain: hpp, transport: http() });
```

## 2. Get a quote

```ts
const amountIn = 10n ** 18n; // 1 token, 18 decimals
const path = [tokenInAddress, tokenOutAddress] as const;

const amounts = await publicClient.readContract({
  address: ADDRESSES.router,
  abi: routerAbi,
  functionName: "getAmountsOut",
  args: [amountIn, path],
});
const quotedOut = amounts[amounts.length - 1];
```

## 3. Approve, if needed

ERC-20 inputs need router allowance before a swap; native ETH does not.
Check first and only send an approval if you're short — the web app
always approves the exact `amountIn`, never an unlimited allowance:

```ts
const allowance = await publicClient.readContract({
  address: tokenInAddress,
  abi: erc20Abi,
  functionName: "allowance",
  args: [account.address, ADDRESSES.router],
});

if (allowance < amountIn) {
  const approveHash = await walletClient.writeContract({
    address: tokenInAddress,
    abi: erc20Abi,
    functionName: "approve",
    args: [ADDRESSES.router, amountIn],
  });
  await publicClient.waitForTransactionReceipt({ hash: approveHash });
}
```

## 4. Apply slippage and a deadline

HPPYSwap's slippage is expressed in **basis points** (bps; 1 bps = 0.01%)
and applied to the quoted output to produce `amountOutMin` — the minimum
you're willing to accept. The web app's default is 50 bps (0.5%). The
deadline is a **Unix timestamp**, computed from a minutes-from-now value —
the web app defaults to 20 minutes.

`applySlippage` is exported from `@hppyswap/sdk` (`packages/sdk/src/math.ts`)
verbatim:

```ts
export function applySlippage(amount: bigint, slippageBps: number): bigint {
  return (amount * BigInt(10000 - slippageBps)) / 10000n;
}
```

```ts
const slippageBps = 50; // 0.5%, same default the web app uses
const deadlineMinutes = 20;

const amountOutMin = applySlippage(quotedOut, slippageBps);
const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineMinutes * 60);
```

## 5. Swap

```ts
const swapHash = await walletClient.writeContract({
  address: ADDRESSES.router,
  abi: routerAbi,
  functionName: "swapExactTokensForTokens",
  args: [amountIn, amountOutMin, path, account.address, deadline],
});
const receipt = await publicClient.waitForTransactionReceipt({ hash: swapHash });
if (receipt.status !== "success") throw new Error("transaction reverted");
```

If either leg of the trade is native ETH, use `swapExactETHForTokens`
(passing `value: amountIn`, no approval needed) or
`swapExactTokensForETH` instead — see `routerAbi` for the full function
list, or read `apps/web/src/hooks/useSwap.ts` in the repository for the
exact branching logic the web app uses.

## Liquidity

`addLiquidity` / `addLiquidityETH` and `removeLiquidity` /
`removeLiquidityETH` on the router follow the same shape: desired amounts
in, a slippage-derived `amountAMin`/`amountBMin` floor, a deadline, and a
`to` recipient. `quote(amountA, reserveA, reserveB)` (also exported from
`@hppyswap/sdk`) derives the matching amount for the other side of an
existing pool from its current reserves, exactly as the pool detail page's
add-liquidity form does. See [Contracts](/dev/contracts/) for ABI
locations and [UI selectors](/agents/ui-selectors/) if you'd rather drive
the liquidity forms through the browser instead.
