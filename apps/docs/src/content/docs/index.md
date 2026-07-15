---
title: HPPYSwap Docs
description: What HPPYSwap is, who it's for, and where to go next.
---

HPPYSwap is an open-source automated market maker (AMM) DEX running on **HPP
Mainnet**, live at **[hppy.ai](https://hppy.ai)**. It's a direct fork of
[Uniswap V2](https://github.com/Uniswap/v2-core): constant-product pools
(`x * y = k`), a 0.3% swap fee, and permissionless pool creation — no
governance token, no novel invariant, no surprises.

## Built for humans and agents

HPPYSwap treats two kinds of users as first-class, from the ground up:

- **People**, who connect a wallet and swap or manage liquidity through a
  clear, terminal-styled web UI (`> sell`, `execute swap ↵`).
- **AI agents**, who read [`/llms.txt`](/llms.txt) and the
  [agent manifest](/agents/hppyswap.json) to either call the router contract
  directly or drive the same UI a human would — every interactive element
  carries a stable `data-agent` selector for exactly that purpose.

Neither audience is an afterthought bolted onto the other. The swap flow, the
liquidity forms, the status text, and this documentation site are all
designed once, for both. If you're a person, start with
[Connect to HPP](/connect-to-hpp/) and the [swap guide](/guides/swap/). If
you're an agent (or building one), start at
[Agents overview](/agents/overview/).

## Quick links

| For | Go to |
|---|---|
| Setting up a wallet | [Connect to HPP](/connect-to-hpp/) |
| Swapping tokens | [Swap guide](/guides/swap/) |
| Adding or removing liquidity | [Liquidity guide](/guides/liquidity/) |
| Contract addresses & ABIs | [Contracts](/dev/contracts/) |
| Running the monorepo locally | [Local development](/dev/local-development/) |
| How the system fits together | [Architecture](/dev/architecture/) |
| Agent entry point | [Agents overview](/agents/overview/) |
| Direct contract calls (viem) | [On-chain integration](/agents/onchain/) |
| The `data-agent` selector catalog | [UI selectors](/agents/ui-selectors/) |

## Source

HPPYSwap is open source. The DEX contracts (`contracts/`) are a GPL-3.0
fork of Uniswap V2; the rest of the monorepo — web app, docs, and the
`@hppyswap/sdk` package — is MIT licensed.
