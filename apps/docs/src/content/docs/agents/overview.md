---
title: Agents overview
description: Entry point for AI agents integrating with HPPYSwap — llms.txt, the agent manifest, and the two ways to trade.
---

HPPYSwap treats AI agents as first-class users, not an afterthought. This
page is the entry point for an agent (or someone building one) landing on
`docs.hppy.ai` for the first time.

## Start here

| Resource | URL | What it's for |
|---|---|---|
| `llms.txt` | [`/llms.txt`](/llms.txt) | A condensed, link-based index of this documentation tree — the standard [llms.txt](https://llmstxt.org/) convention, generated from the same sidebar structure a human sees |
| `llms-full.txt` | [`/llms-full.txt`](/llms-full.txt) | The full content of every doc page concatenated into one plain-text file — no link-following required, everything in one context load |
| Agent manifest | [`/agents/hppyswap.json`](/agents/hppyswap.json) | Machine-readable JSON: chain info, deployment status, contract addresses, default tokens, and links back to this docs site — see below |
| Selector catalog | [`/agents/ui-selectors/`](/agents/ui-selectors/) | Every `data-agent` selector in the web app, for agents driving the UI instead of calling contracts directly |

Fetch `/agents/hppyswap.json` first if you need machine-parseable facts
(is it deployed? what's the router address? what chain?). Fetch
`/llms.txt` or `/llms-full.txt` if you need the documentation content
itself in a form suited to a language model's context window.

## Two ways to trade

An agent has exactly two supported paths for actually executing a swap or
managing liquidity on HPPYSwap — pick whichever fits your setup:

1. **Direct contract calls.** Read the router/factory/pair ABIs and
   addresses from `@hppyswap/sdk` (or the manifest), and call
   `getAmountsOut`, `approve`, and `swapExactTokensForTokens` (or the
   liquidity equivalents) yourself with a library like viem. This is the
   right choice for an agent that already holds keys and signs
   transactions programmatically, with no browser involved. See
   [On-chain integration](/agents/onchain/) for a worked example, including
   the slippage and deadline conventions the web app itself uses.

2. **Drive the UI.** If your agent operates via browser automation
   (clicking, typing, reading rendered text — no direct key access), every
   interactive element in the web app carries a stable `data-agent`
   attribute, and every status/error message is exposed as visible DOM
   text inside an `aria-live="polite"` region — never a spinner-only
   state. This means an agent can locate `[data-agent="swap-execute"]`,
   click it, and read `[data-agent="swap-status"]`'s text content to know
   what happened, exactly the way a screen reader user would. See the full
   [UI selector catalog](/agents/ui-selectors/) for every selector across
   the swap, pools, and pool-detail pages.

Both paths hit the same contracts and the same state — there's no
"agent-only" backend or shortcut API. What HPPYSwap adds for agents is
*legibility*: a manifest that states facts in JSON instead of prose, and a
UI whose structure is documented and versioned instead of implicit.

## What's not here (yet)

There is no MCP server and no public HTTP API beyond the static manifest
and `llms.txt` endpoints in the MVP. Both paths above work with only a
wallet/signer (path 1) or a browser (path 2) — no HPPYSwap-specific
backend integration is required either way.
