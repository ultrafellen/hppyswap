# HPPYSwap Contracts

Smart contracts for HPPYSwap, an AMM DEX on HPP Mainnet. This package vendors
Uniswap V2 (core, periphery, WETH9) via [Foundry](https://book.getfoundry.sh/),
with the original pinned Solidity versions left untouched (core 0.5.16,
periphery 0.6.6, WETH9 >=0.4.22 <0.6) and a Foundry-native test suite
layered on top.

## License

GPL-3.0-or-later. This code is derived from
[Uniswap V2](https://github.com/Uniswap/v2-core) /
[v2-periphery](https://github.com/Uniswap/v2-periphery), which are themselves
GPL-3.0. See `LICENSE`. (The rest of the HPPYSwap monorepo is MIT — see the
repo root `README.md`.)

## Build

```shell
forge build
```

## Test

```shell
forge test
```

6 tests cover AMM core paths (add/remove liquidity, swap, a reserve-invariant
fuzz test) plus an init-code-hash regression check that locks
`UniswapV2Library.pairFor`'s hardcoded hash against the actually-compiled
`UniswapV2Pair` bytecode.

## Deployment

Deployment is a **one-time local operation, never via CI**. `script/Deploy.s.sol`
deploys `UniswapV2Factory`, `WETH9` (unless `WETH_ADDRESS` is set), and
`UniswapV2Router02`, then writes their addresses plus the pair init code hash
to `./deployment-190415.json`.

### 1. Configure `.env`

```shell
cp .env.example .env
```

Fill in `contracts/.env`:

- `DEPLOYER_PRIVATE_KEY` — the deploying account's private key. **Never commit
  this file** (it's git-ignored; only `.env.example` is tracked).
- `WETH_ADDRESS` (optional) — set this to reuse an existing canonical WETH on
  the target chain instead of deploying a fresh `WETH9`. Check
  [explorer.hpp.io](https://explorer.hpp.io) first.
- `HPP_RPC_URL` — RPC endpoint for HPP Mainnet (also configured as the `hpp`
  RPC alias in `foundry.toml`).

### 2. Run the script

Against HPP Mainnet (Task 16, human-supervised):

```shell
forge script script/Deploy.s.sol --rpc-url $HPP_RPC_URL --broadcast
```

Against a local anvil node, for a dry run:

```shell
anvil --port 8545 &
DEPLOYER_PRIVATE_KEY=<any-anvil-test-key> \
  forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast
cat deployment-190415.json
```

### 3. Record and clean up

The script writes `factory`, `weth`, `router`, and `initCodeHash` to
`deployment-190415.json` at the package root. For a real deployment, copy
those addresses into the app's `deployments.json`. For a local dry run,
delete the generated artifacts afterward — `broadcast/` is git-ignored, but
`deployment-190415.json` is NOT git-ignored and must be deleted manually after
recording the addresses; it must never be committed:

```shell
kill %1               # stop anvil
rm deployment-190415.json
rm -rf broadcast
```

`fs_permissions` in `foundry.toml` scopes script filesystem writes to
`deployment-190415.json` only.

## Format

```shell
forge fmt
```

## Documentation

https://book.getfoundry.sh/
