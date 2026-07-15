---
title: How to swap
description: Step-by-step guide to swapping tokens on HPPYSwap.
---

This walks through a swap on the HPPYSwap web app (`hppy.ai`, the `/` route
— the `swap` tab in the nav). No screenshots yet; the UI is a lowercase,
terminal-styled single card.

1. **Connect a wallet.** Click **connect ▾** in the top-right nav. Pick a
   detected wallet from the list. If your wallet is on a different chain,
   the button changes to **switch to hpp** — click it to switch (see
   [Connect to HPP](/connect-to-hpp/)). Once connected, the button shows
   your truncated address (e.g. `0x12…ab34`) and a **disconnect** button.

2. **Pick the token you're selling.** In the `> sell` row, click the token
   button (shows the current symbol and `▾`, or `select token ▾` if none is
   chosen yet). A panel opens listing the default tokens plus any you've
   imported by address. Pick one, or paste a contract address under
   **import by address** and click **add token** to pull in its symbol and
   decimals live from the chain.

3. **Enter an amount.** Type into the amount field next to the sell token.
   Only digits and a single decimal point are accepted, capped at the
   token's decimal precision. Your balance for the selected token is shown
   just below (`balance … `); click **max** to fill the field with your
   full balance.

4. **Pick the token you're buying** the same way in the `> buy` row. That
   field is read-only — it always shows the router's live quote for your
   sell amount, not something you type into. Use the **↓** flip button
   between the two rows to swap the sell/buy sides instantly — it clears
   the amount field rather than carrying it over, since a quote for the
   old pair rarely makes sense for the new one.

5. **Read the quote block** below the card, a three-line dot-leader
   readout:
   - `quote` — the exchange rate, e.g. `1 ETH = 1,842.11 USDC`.
   - `impact` — the price impact of your trade size against current
     reserves, as a percentage. Above **5%** it's shown in a warning color
     with a `⚠ high impact` marker appended to the text.
   - `route` — the swap path. When there's a direct pool between the two
     selected tokens, this reads `direct (TOKEN_IN/TOKEN_OUT)`. Otherwise
     HPPYSwap tries a 2-hop route through USDC.e or WETH, whichever pools
     exist to bridge the pair — e.g. selling ETH for HPP has no direct
     pool, so it routes through USDC.e and shows `via USDC.e`. Only one
     intermediate hop is tried; if even that fails, see below.

6. **Check slippage and deadline** via the ⚙ settings button in the top of
   the card (labeled `slippage 0.50% ⚙` by default). It opens a panel with
   three fields: **slippage tolerance (bps)**, **deadline (minutes)**, and
   an optional **custom rpc url** — plus a **reset to defaults** button.
   Defaults are 50 bps (0.5%) slippage and a 20-minute deadline. A changed
   RPC URL only takes effect after a page reload.

7. **Execute the swap.** Click **execute swap ↵**. If your ERC-20 sell
   token doesn't already have enough router allowance, your wallet will
   first prompt for an **approve** transaction — the status line below the
   button shows `approving token spend…` while that's pending, then
   `swap pending — waiting for confirmation…` once the swap transaction
   itself is submitted, and finally `swap complete` on success.

8. **High-impact trades require confirmation.** If price impact exceeds
   **15%**, the execute button's label changes to **confirm high impact**
   and the status line reads `price impact is high — confirm to proceed`.
   Click it a second time to actually submit the trade — this two-step
   guard exists specifically to stop a fat-fingered amount (or a thin pool)
   from executing without a second look.

If there's no route for the pair you picked — no direct pool, and no
route-base pool pair to bridge it either — the status line reads
`no route for this pair — create a pool in pools` and the execute button
stays disabled (this only shows once you've typed an amount, since a route
can't be quoted without one) — head to the
[liquidity guide](/guides/liquidity/) to create a pool.
