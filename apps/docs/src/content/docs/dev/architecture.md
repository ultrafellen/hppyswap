---
title: Architecture
description: How the HPPYSwap monorepo, chain, and deployment pipeline fit together.
---

## The chain: HPP Mainnet

HPP Mainnet is built on **Arbitrum Orbit (Nitro) with AnyTrust data
availability** — a fully EVM-compatible Layer 2. That means every standard
Ethereum tool (viem, wagmi, Foundry, MetaMask) works against it unmodified;
HPPYSwap doesn't need any chain-specific tooling beyond registering the
network (chain ID `190415`, see [Connect to HPP](/connect-to-hpp/)).
HPPYSwap deploys to this one chain only — there is no testnet deployment
and no network switcher beyond a prompt to switch to HPP Mainnet if your
wallet is elsewhere.

## Monorepo layout

A single pnpm workspace plus a standalone Foundry project:

```
hppyswap/
├─ apps/
│  ├─ web/        # DEX frontend → Cloudflare Workers (static assets), hppy.ai
│  └─ docs/       # this Starlight site → Cloudflare Workers (static assets), docs.hppy.ai
├─ contracts/     # Foundry project (outside the pnpm workspace)
│  ├─ src/core/       # UniswapV2Factory, UniswapV2Pair, UniswapV2ERC20
│  ├─ src/periphery/  # UniswapV2Router02, libraries, WETH9
│  ├─ script/         # local-only forge deploy script
│  └─ test/           # Foundry test suite
├─ packages/
│  └─ sdk/        # @hppyswap/sdk — chain def, ABIs, addresses, AMM math
└─ .github/workflows/
   ├─ ci.yml      # every push/PR: typecheck, test, build (JS + forge)
   └─ deploy.yml  # push to main: path-filtered Cloudflare deploy
```

No monorepo build orchestrator (Turborepo, Nx, etc.) is used — at two apps
and one shared package, `pnpm --filter`/`pnpm -r` plus GitHub Actions path
filters are sufficient. That can change if the workspace grows.

## `@hppyswap/sdk`: single source of truth

Both `apps/web` and `apps/docs` depend on `@hppyswap/sdk` via
`workspace:*` rather than duplicating chain constants, contract addresses,
ABIs, or AMM math. Concretely, the SDK exports:

- `hpp` — the viem `Chain` object for HPP Mainnet (chain ID, RPC/WSS URLs,
  block explorer, Multicall3 address).
- `ADDRESSES` — deployed contract addresses, sourced from
  `deployments.json` and the zero address before deployment (see
  [Contracts](/dev/contracts/)); `isDeployed()` reports whether a real
  deployment has happened yet.
- `factoryAbi` / `pairAbi` / `routerAbi` / `wethAbi` / `erc20Abi` —
  `const`-asserted ABIs, the router/factory/pair ones synced directly from
  Foundry build artifacts so they can never drift from the deployed
  bytecode.
- `DEFAULT_TOKENS` / `TokenInfo` — the app's starting token list.
- `getAmountOut`, `getAmountIn`, `quote`, `applySlippage`,
  `priceImpactBps` — the same constant-product math the on-chain router
  uses, so the frontend's live quote preview and impact warnings agree
  with what a transaction will actually do.

This means a contract redeployment or address change is a one-line edit in
`packages/sdk/src/deployments.json`, consumed by every app (and by the
[agent manifest](/agents/hppyswap.json), which imports the SDK directly)
without touching app code.

## Deployment pipeline

| What | How | When |
|---|---|---|
| `apps/web`, `apps/docs` | GitHub Actions builds and deploys via `cloudflare/wrangler-action`, Cloudflare Workers static assets, path-filtered per app (only redeploys the app whose files — or the shared SDK — actually changed) | Automatically on every push to `main` |
| `contracts/` | `forge script` run locally, once, by a human with a private key in a local `.env` — never in CI | Manual, one-time (see [Local development](/dev/local-development/)) |

`ci.yml` runs on every push and pull request: a JS job (`pnpm typecheck`,
`pnpm test`, `pnpm build`) and a contracts job (`forge build`,
`forge test`). `deploy.yml` runs only on pushes to `main`, uses
`dorny/paths-filter` to detect whether `apps/web/**`, `apps/docs/**`, or
`packages/sdk/**` changed, and deploys only the affected app(s) — a docs-only
change never redeploys the web app and vice versa, but a change to the
shared SDK triggers both, since either could depend on it.

Contracts are deliberately excluded from this automation: a deployment
happens once, deploying twice would create a second, disconnected set of
pools, and there's no reason to put a funded private key in a CI secret
for an operation that only ever runs a handful of times.

## Agent-facing surface

The dual-audience philosophy described on the [homepage](/) shows up
concretely at the architecture level too: the docs site serves
[`/llms.txt`](/llms.txt) and [`/llms-full.txt`](/llms-full.txt) (machine
digests of this content tree) and a JSON [agent manifest](/agents/hppyswap.json)
built at deploy time directly from `@hppyswap/sdk`, so it can never fall
out of sync with what the SDK (and therefore the live app) actually uses.
See [Agents overview](/agents/overview/) for the full picture.
