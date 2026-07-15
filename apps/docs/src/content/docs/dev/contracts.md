---
title: Contracts
description: Deployed addresses, ABI locations, and fork notes for the HPPYSwap contracts.
---

## Deployment status

**Deployed on HPP Mainnet.** HPPYSwap's contracts were deployed once,
locally, by a human running `forge script` (never via CI — see
[Local development](/dev/local-development/)), then verified on-chain. The
app's `isDeployed()` helper now returns `true`, enabling the swap and
liquidity forms in the UI.

The source of truth is `packages/sdk/src/deployments.json`, keyed by chain
ID (`190415` for HPP Mainnet) — this page and the
[agent manifest](/agents/hppyswap.json) both read from it indirectly (this
page is updated by hand alongside the deployment; the manifest reads it at
build time via `@hppyswap/sdk`).

| Contract | Address | Notes |
|---|---|---|
| `UniswapV2Factory` | [`0xf799BF70CEb51e26efa1d9744BE617Bab7b88e41`](https://explorer.hpp.io/address/0xf799BF70CEb51e26efa1d9744BE617Bab7b88e41) | Creates and indexes pairs |
| `UniswapV2Router02` | [`0x661aA4D2B0e3348125DEe6E75A28aD8E1e66f8a7`](https://explorer.hpp.io/address/0x661aA4D2B0e3348125DEe6E75A28aD8E1e66f8a7) | Swap / add-liquidity / remove-liquidity entry point |
| `WETH9` | [`0x82553CDA0bEd9262a879F9F7524cd20288B357AA`](https://explorer.hpp.io/address/0x82553CDA0bEd9262a879F9F7524cd20288B357AA) | Canonical WETH, pre-existing on HPP Mainnet — not deployed by this repo |
| `Multicall3` | [`0xcA11bde05977b3631167028862bE2a173976CA11`](https://explorer.hpp.io/address/0xcA11bde05977b3631167028862bE2a173976CA11) | Canonical CREATE2 address, pre-deployed on HPP; batches read calls |

Init code hash (see below): `0x5800ffe4b53beb540183bd1f16bf7fa0957897af8ffe1266f1a1c30ea0b58b72`

## Default tokens

These are the `DEFAULT_TOKENS` exported from `@hppyswap/sdk` — the same
three tokens the web app's swap and pool forms default to — and the
[agent manifest](/agents/hppyswap.json) serves each one's icon as an
absolute logo URL (resolved against `https://hppy.ai`) so agents don't need
to guess a base path.

| Icon | Symbol | Name | Address | Decimals |
|---|---|---|---|---|
| <img src="/tokens/eth.png" alt="" width="20" height="20" style="vertical-align:middle;border-radius:50%;background:#eef2f6;border:1px solid #ccc" /> | ETH | Ether (native) | [`0x82553CDA0bEd9262a879F9F7524cd20288B357AA`](https://explorer.hpp.io/address/0x82553CDA0bEd9262a879F9F7524cd20288B357AA) (WETH) | 18 |
| <img src="/tokens/hpp.png" alt="" width="20" height="20" style="vertical-align:middle;border-radius:50%;background:#eef2f6;border:1px solid #ccc" /> | HPP | HousePartyProtocol | [`0xB48334E7938367bC24Fe1F19000D6f06C622E6c7`](https://explorer.hpp.io/address/0xB48334E7938367bC24Fe1F19000D6f06C622E6c7) | 18 |
| <img src="/tokens/usdce.png" alt="" width="20" height="20" style="vertical-align:middle;border-radius:50%;background:#eef2f6;border:1px solid #ccc" /> | USDC.e | Bridged USDC | [`0x401eCb1D350407f13ba348573E5630B83638E30D`](https://explorer.hpp.io/address/0x401eCb1D350407f13ba348573E5630B83638E30D) | 6 |

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
