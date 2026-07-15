---
title: Local development
description: Set up the HPPYSwap monorepo locally.
---

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | >=24 (see repo root `.nvmrc`) |
| pnpm | 11.13.0 (pinned via `packageManager` in root `package.json`) |
| Foundry (`forge`, `anvil`, `cast`) | latest stable — install via `curl -L https://foundry.paradigm.xyz \| bash && foundryup` |

```bash
corepack enable && corepack prepare pnpm@latest --activate
pnpm --version   # should print 11.13.0 or newer
forge --version  # confirms Foundry is on PATH
```

## Monorepo layout

HPPYSwap is a pnpm workspace (`apps/*`, `packages/*`) plus a Foundry project
that sits outside the pnpm workspace:

| Path | What it is |
|---|---|
| `apps/web` | The DEX frontend (React 19 + Vite + wagmi/viem) — deployed to `hppy.ai` |
| `apps/docs` | This documentation site (Astro + Starlight) — deployed to `docs.hppy.ai` |
| `packages/sdk` | `@hppyswap/sdk` — chain definition, ABIs, deployed addresses, AMM math. Single source of truth consumed by both apps |
| `contracts` | Foundry project — the vendored Uniswap V2 fork, tests, and the local-only deploy script. Not a pnpm workspace member (it has its own toolchain) |

## Install

```bash
git clone https://github.com/ultrafellen/hppyswap.git
cd hppyswap
pnpm install
```

This installs and links all `apps/*` and `packages/*` workspaces in one
pass — `@hppyswap/sdk` is consumed by `apps/web` and `apps/docs` via
`workspace:*`, so changes to the SDK are picked up immediately by both
without a publish step.

## Run things

```bash
# JS/TS workspaces, from the repo root:
pnpm -r build       # build every app/package (apps/web: tsc + vite build; apps/docs: astro build; sdk: tsc --noEmit)
pnpm -r test         # run every workspace's vitest suite
pnpm -r typecheck    # tsc --noEmit / astro check across workspaces

# A single workspace, e.g. just the web app:
pnpm --filter hppyswap-web dev
pnpm --filter hppyswap-docs dev

# Contracts (Foundry, run from contracts/ or with --root):
cd contracts
forge build
forge test -vv
```

## Deploying contracts is local-only

Unlike `apps/web` and `apps/docs` (which CI builds and deploys to
Cloudflare Workers automatically on every push to `main` — see
[Architecture](/dev/architecture/)), **contract deployment is a manual,
one-time, local operation.** It is never run in CI, and no deployer private
key is ever stored as a CI secret.

Deploying (or dry-running against a local `anvil` node) requires a
`contracts/.env` file with `DEPLOYER_PRIVATE_KEY` and `HPP_RPC_URL` — see
`contracts/README.md` in the repository for the full walkthrough, including
how the deploy script records the resulting factory/router/WETH addresses
and the pair init code hash for `packages/sdk/src/deployments.json`.
