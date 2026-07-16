---
name: hppyswap-dex
description: Use when swapping, quoting, or providing/removing liquidity on HPPYSwap, an AMM DEX on HPP Mainnet — covers direct router calls and driving the hppy.ai web UI.
---

# HPPYSwap

HPPYSwap is a direct fork of [Uniswap V2](https://github.com/Uniswap/v2-core)
— constant-product pools (`x * y = k`), a 0.3% swap fee, permissionless pool
creation, no governance token — deployed on **HPP Mainnet** (chainId
`190415`, RPC `https://mainnet.hpp.io`). The app is at
[hppy.ai](https://hppy.ai); docs are at
[docs.hppy.ai](https://docs.hppy.ai).

> **HPPYSwap is an experimental, open-source personal project.** This
> deployment has not been independently audited, and liquidity is small. It
> is non-custodial and has no protocol fee — use it at your own risk, with
> funds you can afford to lose. Full disclaimer:
> [`/agents/hppyswap.json`](https://docs.hppy.ai/agents/hppyswap.json)'s
> `disclaimer` field.

## Resources

Fetch these before doing anything else — they're the source of truth, not
this file:

| Resource | URL | Contains |
|---|---|---|
| Agent manifest | https://docs.hppy.ai/agents/hppyswap.json | Chain info, `deployed`/`status`, contract addresses, default tokens, `routeBases`, `usdAnchor` |
| `llms.txt` | https://docs.hppy.ai/llms.txt | Link-based index of the full docs site |
| `llms-full.txt` | https://docs.hppy.ai/llms-full.txt | Every doc page concatenated, no link-following needed |
| Token list | https://docs.hppy.ai/tokenlist.json | Uniswap Token List schema: `chainId`, `address`, `symbol`, `name`, `decimals`, `logoURI` |
| ABIs | https://docs.hppy.ai/agents/abis.json | `factory`, `router`, `pair`, `weth`, `erc20` ABI arrays |
| Selector catalog | https://docs.hppy.ai/agents/ui-selectors/ | Every `data-agent` selector in the web app |
| On-chain integration guide | https://docs.hppy.ai/agents/onchain/ | The full worked example this skill's Path A condenses |

## Path A — direct on-chain calls

For an agent that already holds keys and signs transactions itself, no
browser involved. Router: `0x661aA4D2B0e3348125DEe6E75A28aD8E1e66f8a7`.

1. **Check deployment status first.** Read `deployed` (or call
   `isDeployed()` from `@hppyswap/sdk`) before anything else — a stale
   build or a future redeploy to a new chain should hard-stop, not silently
   send a transaction to the wrong place.
2. **Quote.** Call the router's `getAmountsOut(amountIn, path)` (a `view`
   function — no gas, no signature). `path` is `[tokenIn, tokenOut]` for a
   direct pool. If no direct pool exists, fall back to a 2-hop path through
   a route base from the manifest's `routeBases` (currently WETH and
   USDC.e): `[tokenIn, routeBase, tokenOut]`, quoting every candidate route
   base and keeping whichever quotes the highest output (HPPYSwap caps this
   at one intermediate hop).
3. **Approve, if the input is an ERC-20** (skip for native ETH). Check
   `allowance(owner, router)` first; only send `approve(router, amountIn)`
   if it's short — approve the exact `amountIn`, never an unlimited
   allowance.
4. **Apply slippage and a deadline.** Slippage is basis points (bps; 1 bps =
   0.01%) applied to the quoted output to get `amountOutMin`:
   `amountOutMin = quotedOut * (10000 - slippageBps) / 10000`. Deadline is a
   Unix timestamp, `now + deadlineMinutes * 60`. **Never use a slippage
   value looser than what the user authorized** — if the user gave no
   value, use the web app's defaults (50 bps / 0.5% slippage, 20 minute
   deadline) rather than guessing wider.
5. **Swap.** Call `swapExactTokensForTokens(amountIn, amountOutMin, path,
   to, deadline)` (or `swapExactETHForTokens` / `swapExactTokensForETH` when
   one leg is native ETH — same shape, `value: amountIn` and no approval
   for the ETH leg). Wait for the receipt and check `status === "success"`.

Minimal viem sketch (mirrors `apps/web/src/hooks/useSwap.ts` and the full
example at [`/agents/onchain/`](https://docs.hppy.ai/agents/onchain/) —
treat that page as authoritative if this ever drifts):

```ts
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hpp, ADDRESSES, routerAbi, erc20Abi, applySlippage } from "@hppyswap/sdk";

const account = privateKeyToAccount("0x…");
const publicClient = createPublicClient({ chain: hpp, transport: http() });
const walletClient = createWalletClient({ account, chain: hpp, transport: http() });

// 1. Quote
const path = [tokenIn, tokenOut] as const;
const amounts = await publicClient.readContract({
  address: ADDRESSES.router, abi: routerAbi,
  functionName: "getAmountsOut", args: [amountIn, path],
});
const quotedOut = amounts[amounts.length - 1];

// 2. Approve if short
const allowance = await publicClient.readContract({
  address: tokenIn, abi: erc20Abi,
  functionName: "allowance", args: [account.address, ADDRESSES.router],
});
if (allowance < amountIn) {
  const hash = await walletClient.writeContract({
    address: tokenIn, abi: erc20Abi,
    functionName: "approve", args: [ADDRESSES.router, amountIn],
  });
  await publicClient.waitForTransactionReceipt({ hash });
}

// 3. Slippage + deadline, then swap
const amountOutMin = applySlippage(quotedOut, 50); // 50 bps default
const deadline = BigInt(Math.floor(Date.now() / 1000) + 20 * 60);
const swapHash = await walletClient.writeContract({
  address: ADDRESSES.router, abi: routerAbi,
  functionName: "swapExactTokensForTokens",
  args: [amountIn, amountOutMin, path, account.address, deadline],
});
const receipt = await publicClient.waitForTransactionReceipt({ hash: swapHash });
if (receipt.status !== "success") throw new Error("transaction reverted");
```

Liquidity follows the same shape: `addLiquidity`/`addLiquidityETH` and
`removeLiquidity`/`removeLiquidityETH` on the router take desired amounts, a
slippage-derived `amountAMin`/`amountBMin` floor, and a deadline — see
[On-chain integration](https://docs.hppy.ai/agents/onchain/#liquidity).

If a call reverts, check the revert string against
[`/agents/errors/`](https://docs.hppy.ai/agents/errors/) before retrying —
most reverts (expired deadline, slippage exceeded, insufficient liquidity)
have a specific, non-retryable-as-is cause.

## Path B — drive the UI

For an agent operating via browser automation (clicking, typing, reading
rendered text — no direct key access) against
[hppy.ai](https://hppy.ai). Every interactive element carries a stable
`data-agent="…"` attribute, and every status/error message is visible DOM
text inside an `aria-live="polite"` region — never a spinner-only state.
Full catalog: [`/agents/ui-selectors/`](https://docs.hppy.ai/agents/ui-selectors/).

Core swap-flow selectors:

| Selector | Purpose |
|---|---|
| `swap-token-in` / `swap-token-out` | Open the token picker for the sell / buy side |
| `swap-amount-in` | Type the amount to sell |
| `swap-amount-out` | Read-only; shows the live router quote |
| `swap-route` | Text: `direct (...)` or `via BASE_SYMBOL` for a 2-hop route |
| `swap-impact` | Price-impact percentage; includes a literal `⚠ high impact` marker above 5% |
| `swap-execute` | Submits the swap; label toggles to "confirm high impact" above 15% impact (click twice) |
| `swap-status` | `aria-live` region — read this text to know what happened: approving / pending / success / a specific error string |

## Safety rules

- **Never exceed the user-authorized slippage.** If unspecified, use the
  web app's default (50 bps) rather than widening it to force a fill.
- **Check `deployed` and `status` in the manifest before transacting.** A
  `false`/non-`"experimental"` value means don't send anything.
- **Liquidity is small.** Quote before sizing a trade — price impact on a
  large order can be severe on a low-liquidity pool; read `swap-impact` or
  compute it from reserves rather than assuming deep liquidity.
- **Verify chainId `190415`** on both the RPC connection and the connected
  wallet before signing or sending anything — a signature valid on HPP
  Mainnet is meaningless (or dangerous) replayed elsewhere.
