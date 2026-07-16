---
title: Managing liquidity
description: Step-by-step guide to creating pools and adding/removing liquidity on HPPYSwap.
---

This covers the `pools` tab (`hppy.ai/pools`) and pool detail pages
(`hppy.ai/pools/:pairAddress`, or `/pools/new` for a brand-new pair). No
screenshots yet; the UI matches the same lowercase terminal style as the
swap page.

## Browse existing pools

The pools list (`hppy.ai/pools`) shows a table of every pair the factory has
created, up to the first 50 (a `showing first 50 of N pools` note appears
if there are more). Each row shows the pair as `BASE/QUOTE` (e.g.
`WETH/USDC.e`, `HPP/USDC.e` — stables and WETH act as the quote side) and
both reserves in that same order. This is a display convention only: the
pair's on-chain `token0`/`token1` are always address-sorted by the factory,
so an agent reading reserves directly via RPC gets that address order, not
this display order. Click anywhere on a row — or the pair link directly —
to open that pool's detail page. If no pools exist yet, the status line
reads `no pools yet — be the first: add liquidity`.

## Create a new pool

1. From the pools list, click **+ create pool** (top-right). This opens
   `/pools/new`.
2. Pick **token a** and **token b** the same way you'd pick a token on the
   swap page — click the token trigger, choose from the list, or import a
   token by contract address.
3. If a pool for that exact pair already exists, HPPYSwap detects it and
   redirects you straight to the existing pool's detail page instead of the
   new-pool form — you can't accidentally create a duplicate pair.
4. For a genuinely new pair, an **add liquidity** form appears with a note:
   **"you are setting the initial price for this pool."** Whatever ratio of
   the two token amounts you deposit becomes the pool's starting price —
   there's no existing reserve to match, so double-check your amounts.
5. Enter both amounts and click **add liquidity ↵**. Since the pool's
   address doesn't exist client-side until the transaction confirms, a
   successful creation sends you back to the pools list rather than to a
   detail page.

## Add liquidity to an existing pool

Open the pool from the pools list (or navigate directly to
`/pools/0x…pairAddress`). The header shows the current `reserves: … · …`
and, if you're connected, `my LP … (X.XX% share)`.

In the `> deposit` section, type an amount into either token field —
HPPYSwap automatically derives the matching amount for the other token from
the pool's current reserve ratio (you can't set an off-ratio deposit for an
existing pool the way you can for a brand-new one). Click
**add liquidity ↵** to submit. If your wallet doesn't yet have enough
router allowance for either token, you'll see one or two **approve**
prompts first, surfaced in the status line the same way as on the swap
page (`approving token spend…` → `transaction pending — waiting for
confirmation…` → `liquidity updated`).

## Remove liquidity

On an existing pool's detail page, the `> withdraw` section shows four
percent-preset buttons: **25%**, **50%**, **75%**, **100%** — real
`<button>` elements, not a slider. Clicking one computes the LP amount for
that share of your balance and shows it just below (e.g. `12.34 LP`, or
`select a percent` before you've picked one). Click **remove liquidity ↵**
to submit — this burns that LP amount via the router, which requires one
approval for the LP token itself (the pair contract) if the router doesn't
already have enough allowance.

## Status and errors

Every action on this page reports through a single status line at the
bottom (`liq-status`, an `aria-live="polite"` region): pool loading,
approval/pending progress, `liquidity updated` on success, or a
human-readable error (e.g. wallet rejection, slippage revert) on failure.
If contracts aren't deployed yet on the current chain, every form is
replaced by `contracts not deployed yet — see docs.hppy.ai`.
