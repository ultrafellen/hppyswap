---
title: Contracts
description: Deployed addresses, ABI locations, and fork notes for the HPPYSwap contracts.
---

## Deployment status

**Not deployed yet.** HPPYSwap's contracts on HPP Mainnet are deployed once,
locally, by a human running `forge script` (never via CI — see
[Local development](/dev/local-development/)). Until that happens, every
address below is the zero address and the app's `isDeployed()` helper
returns `false`, which disables the swap and liquidity forms in the UI.

**Addresses will be published here** the moment deployment happens. The
source of truth is `packages/sdk/src/deployments.json`, keyed by chain ID
(`190415` for HPP Mainnet) — this page and the
[agent manifest](/agents/hppyswap.json) both read from it indirectly (this
page is updated by hand alongside the deployment; the manifest reads it at
build time via `@hppyswap/sdk`).

| Contract | Address | Notes |
|---|---|---|
| `UniswapV2Factory` | `0x0000…0000` (placeholder) | Creates and indexes pairs |
| `UniswapV2Router02` | `0x0000…0000` (placeholder) | Swap / add-liquidity / remove-liquidity entry point |
| `WETH9` | `0x0000…0000` (placeholder) | Only deployed if HPP Mainnet has no canonical WETH already |
| `Multicall3` | `0xcA11bde05977b3631167028862bE2a173976CA11` | Canonical CREATE2 address, assumed pre-deployed on HPP; batches read calls |

## Init code hash

`UniswapV2Library.pairFor` derives a pair's address deterministically from
`keccak256(abi.encodePacked(hex"ff", factory, salt, initCodeHash))` — it
never calls the factory on-chain to look up a pair address. That
`initCodeHash` **must exactly match** the keccak256 of `UniswapV2Pair`'s
creation bytecode as compiled by this repo's Foundry toolchain — it is
*not* Uniswap's well-known mainnet hash (`0x96e8ac4277…`), because
different compiler/metadata settings change the creation bytecode. The
contracts package includes a permanent regression test
(`contracts/test/InitCodeHash.t.sol`) that deploys a real pair and asserts
`pairFor`'s prediction matches it, so this can never silently drift out of
sync after a Solidity or Foundry version bump. The verified hash is
recorded in `packages/sdk/src/deployments.json` alongside the deployed
addresses.

## ABIs

All contract ABIs are published as TypeScript `const`-asserted arrays from
`@hppyswap/sdk`, generated directly from Foundry build artifacts
(`contracts/out/`) by `packages/sdk/scripts/sync-abis.mjs` — never hand
edited:

```ts
import { factoryAbi, pairAbi, routerAbi, wethAbi, erc20Abi } from "@hppyswap/sdk";
```

`erc20Abi` is re-exported from `viem` directly (standard ERC-20 surface,
no need to vendor it separately).

## Uniswap V2 fork notes

HPPYSwap's `contracts/` package is a direct, unmodified fork of
[Uniswap V2](https://github.com/Uniswap/v2-core) core and
[periphery](https://github.com/Uniswap/v2-periphery), vendored via Foundry
rather than reimplemented:

- **Core** (`UniswapV2Factory`, `UniswapV2Pair`, `UniswapV2ERC20`) keeps the
  original `pragma solidity =0.5.16`. **Periphery**
  (`UniswapV2Router02`, `UniswapV2Library`) keeps `=0.6.6`. There is no
  0.8.x modernization — an audited, unmodified bytecode is worth more than
  a cleaner compiler target.
- Constant-product AMM (`x * y = k`), 0.3% swap fee, permissionless
  `createPair`. No governance token, no protocol fee (`feeTo` is
  initialized but never turned on in the MVP).
- `WETH9` is only deployed if HPP Mainnet doesn't already have a canonical
  wrapped-ETH contract; the deploy script checks first and reuses an
  existing one via the `WETH_ADDRESS` environment variable if set.
- **License:** everything under `contracts/` is
  **GPL-3.0-or-later**, inherited from upstream Uniswap V2 — see
  `contracts/LICENSE`. This is the one part of the HPPYSwap monorepo that
  is *not* MIT; the web app, docs site, and `@hppyswap/sdk` package are all
  MIT licensed.

See `contracts/README.md` in the repository for build, test, and
deployment instructions.
