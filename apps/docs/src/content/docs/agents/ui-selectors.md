---
title: UI selector catalog
description: The full data-agent selector contract for the HPPYSwap web app, for agents driving the UI directly.
---

Every interactive element in the HPPYSwap web app (`hppy.ai`) carries a
stable `data-agent="…"` attribute. This is the contract an agent driving
the UI via browser automation relies on instead of guessing at CSS classes
or visible text (which can change for purely cosmetic reasons).

## The contract

- **Coverage.** Every button, input, and state-bearing element a person
  needs to complete a swap or manage liquidity has a `data-agent` selector.
  Purely decorative elements do not.
- **Stability.** `data-agent` values are a versioned contract, not an
  implementation detail. **A selector rename, removal, or semantic change
  is a breaking change** and must be recorded in the [changelog](#changelog)
  below, in the same pull request that makes the change.
- **Semantic HTML only.** Every selector is on a real `<button>`,
  `<input>`, `<table>`, or similar — never a `<div onClick>` masquerading
  as one. Percent-preset controls (`liq-remove-percent`) are real
  `<button>` elements, not a slider or drag control.
- **State via DOM text, not visual state.** Status and error messages are
  exposed as the `textContent` of an `aria-live="polite"` `role="status"`
  region — never a spinner-only or color-only state. An agent reading
  `[data-agent="swap-status"]`'s text content sees exactly what a screen
  reader user hears: `"approving token spend…"`, `"swap complete"`, a
  specific error string, or (most of the time) empty text when there's
  nothing to report. The price-impact warning follows the same rule: above
  5% impact, `[data-agent="swap-impact"]`'s text includes a literal
  `⚠ high impact` marker appended to the percentage — an agent doesn't need
  to parse color or CSS classes to detect it.
- **USD conversions render, even with nothing to show.** `swap-usd-in` and
  `swap-usd-out` are always present in the DOM once a swap side has a token
  selected — when there's no amount typed yet, or no USD price route is
  known for that token (no direct or WETH-bridged USDC.e pool), the element
  renders with **empty text content** rather than being omitted or showing
  a placeholder like "$0" or "—". `pool-tvl` and `liq-position-value`
  follow the opposite, table/summary-line convention instead: they render
  the literal text `"—"` when no USD price is known, since they sit next to
  other always-populated cells/lines rather than being the sole content of
  an input's helper line.
- **Display order is base/quote, not on-chain order.** Pair labels and
  reserves text (`pool-row`'s pair link, `pools-table`'s reserves column,
  `liq-reserves`) show tokens as `BASE/QUOTE` — stables (USDC.e) and WETH
  are treated as the quote side, e.g. `WETH/USDC.e`, `HPP/USDC.e` —
  regardless of the pair contract's on-chain `token0`/`token1`, which the
  factory always orders by ascending address. An agent reading reserves
  straight off the chain (`getReserves`/`token0`/`token1`) gets that
  address-sorted order, not this display order — don't assume they match.

## Global (every page)

| Selector | Element | Purpose |
|---|---|---|
| `nav-home` | Logo link (`><` mark + "hppyswap") | Navigate to `/` |
| `nav-swap` | "swap" nav link | Navigate to `/` |
| `nav-pools` | "pools" nav link | Navigate to `/pools` |
| `nav-docs` | "docs" nav link (external) | Opens `docs.hppy.ai` in a new tab |
| `theme-toggle` | Light/dark toggle button | Toggles `--theme`, persisted to `localStorage` |
| `status-line` | Default status region (`role="status"`, `aria-live="polite"`) | Fallback selector on the shared `StatusLine` component; each page below overrides it with a page-specific name (`swap-status`, `pools-status`, `liq-status`) — treat those as the concrete selectors, this as the underlying pattern |
| `wallet-connect` | "connect ▾" button | Shown when disconnected; opens the connector picker |
| `wallet-switch-chain` | "switch to hpp" button | Shown when connected to the wrong chain |
| `wallet-disconnect` | "disconnect" button | Shown when connected to HPP Mainnet, next to the truncated address |

## Swap (`/`)

| Selector | Element | Purpose |
|---|---|---|
| `swap-amount-in` | Sell amount `<input>` | Type the amount to sell |
| `swap-usd-in` | Sell-side USD line | Text: `~$1,934.21`-style USD conversion of the typed sell amount, USDC.e-anchored (see [Deriving USD prices](/agents/onchain/#deriving-usd-prices)); empty text when no amount is typed or no USD price route is known |
| `swap-max` | "max" button | Fills the sell amount with the connected wallet's full balance of the sell token |
| `swap-amount-out` | Buy amount `<input>` (read-only) | Shows the live router quote for the sell amount |
| `swap-usd-out` | Buy-side USD line | Same convention as `swap-usd-in`, for the quoted buy amount |
| `swap-token-in` | Sell token select trigger | Opens the token picker for the sell side |
| `swap-token-out` | Buy token select trigger | Opens the token picker for the buy side |
| `swap-direction-flip` | "↓" button | Swaps sell/buy tokens and clears the amount |
| `swap-quote-line` | Quote row container | Text: `1 TOKEN_IN = X TOKEN_OUT` |
| `swap-impact` | Price impact value text | Percentage; includes `⚠ high impact` in its text above 5% |
| `swap-route` | Route row container | Text: `direct (TOKEN_IN/TOKEN_OUT)` when a direct pool exists, else `via BASE_SYMBOL` for a 2-hop route through a route base (e.g. `via USDC.e`) — capped at one intermediate hop |
| `swap-execute` | Execute button | Label toggles to "confirm high impact" above 15% impact (click twice) |
| `swap-status` | `aria-live` status region | Approve/pending/success/error text; see [the contract](#the-contract) |
| `settings-trigger` | "slippage X% ⚙" button | Opens the slippage/deadline/RPC settings panel |
| `settings-slippage` | Slippage tolerance `<input>` (bps) | Basis points, e.g. `50` = 0.5%. Default 50 |
| `settings-deadline` | Deadline `<input>` (minutes) | Minutes from now. Default 20 |
| `settings-rpc` | Custom RPC URL `<input>` | Overrides the public RPC; requires a page reload to take effect |
| `settings-reset` | "reset to defaults" button | Restores slippage/deadline/RPC to their defaults |

## Pools (`/pools`)

| Selector | Element | Purpose |
|---|---|---|
| `pools-table` | `<table>` of all pools | Columns: pair, reserves, tvl |
| `pool-row` | `<tr>` per pool | Also carries `data-pair="0x…"` — the pair contract address; click navigates to `/pools/:pairAddress` |
| `pool-tvl` | tvl `<td>` per pool row | Both reserves' combined USD value (see [Deriving USD prices](/agents/onchain/#deriving-usd-prices)); text `"—"` when no USD price is known for one or both sides. Also used, unchanged, for the pool detail page's total-TVL header line below |
| `pools-create` | "+ create pool" link | Navigates to `/pools/new` |
| `pools-limit-note` | "showing first N of M pools" text | Only present when the factory has more pairs than the list's 50-row limit |
| `pools-status` | `aria-live` status region | "no pools yet…", "loading pools…", or the not-deployed message |

## Pool detail (`/pools/:pairAddress`, `/pools/new`)

| Selector | Element | Purpose |
|---|---|---|
| `liq-token-a` | Token A select trigger | `/pools/new` only — picks the first token of a brand-new pair |
| `liq-token-b` | Token B select trigger | `/pools/new` only — picks the second token |
| `liq-amount-a` | Deposit amount A `<input>` | For an existing pool, typing here auto-derives amount B from the reserve ratio |
| `liq-amount-b` | Deposit amount B `<input>` | Same, deriving amount A |
| `liq-add-execute` | "add liquidity ↵" button | Submits the add-liquidity transaction (with approvals as needed) |
| `liq-lp-balance` | "my LP … (X% share)" text | Only on an existing pool, when connected |
| `pool-tvl` | "tvl …" text | Only on an existing pool. Same selector as the pools list's tvl column (see above) — both reserves' combined USD value, `"—"` when unknown |
| `liq-position-value` | "my position …" text | Only on an existing pool. `share × tvl` — the caller's LP share of the pool's combined USD value, computed as `tvl × lpBalance / totalSupply` (bigint throughout, not `sharePercent × tvl`); `"—"` when tvl is unknown |
| `liq-reserves` | "reserves: …" text | Only on an existing pool |
| `liq-initial-price-note` | "you are setting the initial price for this pool." text | Only shown for a brand-new pool (no existing ratio to match) |
| `liq-remove-percent-group` | Container `<div>` for the 4 percent buttons | Groups the preset buttons below |
| `liq-remove-percent` | Percent preset `<button>` ×4 | Real buttons, each with `data-percent="25"` / `"50"` / `"75"` / `"100"` |
| `liq-remove-amount` | "X LP" / "select a percent" text | Reflects the currently selected percent's LP amount |
| `liq-remove-execute` | "remove liquidity ↵" button | Submits the remove-liquidity transaction |
| `liq-status` | `aria-live` status region | Loading/approve/pending/success/error/not-found text |

## Derived selectors: token picker

Every token-select trigger listed above (`swap-token-in`, `swap-token-out`,
`liq-token-a`, `liq-token-b`) opens the same shared `TokenSelect` picker
component, which exposes these selectors regardless of which trigger
opened it:

| Selector | Element | Purpose |
|---|---|---|
| `token-option` | `<button>` per token row in the open picker's list | Also carries `data-address="0x…"` — the token's checksum-agnostic contract address. Since `token-option` itself isn't unique (one per row), disambiguate by pairing the selector with `data-address`, not by row position or visible text |
| `{selector}-import` | "import by address" text `<input>` | Namespaced per trigger, e.g. `swap-token-in-import`. Typing a valid ERC-20 contract address here enables `token-import-confirm` |
| `token-import-confirm` | "add token" button | Confirms the import: reads symbol/decimals live from the chain, adds the token to the picker's list, and selects it. Disabled until the typed address resolves to a valid ERC-20. Not namespaced per trigger — only one picker panel is open at a time |

## Changelog

Selector additions are backward compatible; renames, removals, or
behavior changes are not and are logged here with the app version/commit
they shipped in.

- v1.2 — added swap-usd-in, swap-usd-out, pool-tvl, liq-position-value
- v1.3 — pair labels, icons, and reserve text in `pool-row` and `liq-reserves` now render in base/quote display order (stables and WETH last); on-chain token0/token1 order is unchanged and `data-pair` still identifies pools by address
- v1.1 — added token-option, token-import-confirm, swap-max, settings-reset
- **v1 — initial catalog** (2026-07-15). The full set of selectors listed
  above, covering the swap page, pools list, and pool detail page — the
  first published version of this contract, matching the web app as
  implemented through the swap/pools/liquidity features.
