```
 ><  hppyswap
```

An open-source AMM DEX on HPP Mainnet, built for humans and AI agents.

## What is HPPYSwap

HPPYSwap is a direct fork of [Uniswap V2](https://github.com/Uniswap/v2-core):
constant-product pools (`x * y = k`), a 0.3% swap fee, and permissionless
pool creation — no governance token, no novel invariant. It's built for two
kinds of users from the ground up: people connecting a wallet through a
terminal-styled web UI, and AI agents that either call the router contract
directly or drive that same UI via a documented, stable selector contract.

## Live

- App: [hppy.ai](https://hppy.ai) (also [www.hppy.ai](https://www.hppy.ai))
  — the DEX
- Docs: [docs.hppy.ai](https://docs.hppy.ai) — documentation

### Deployed contracts (HPP Mainnet, chainId 190415)

| Contract | Address |
|---|---|
| Factory | [`0xf799BF70CEb51e26efa1d9744BE617Bab7b88e41`](https://explorer.hpp.io/address/0xf799BF70CEb51e26efa1d9744BE617Bab7b88e41) |
| Router | [`0x661aA4D2B0e3348125DEe6E75A28aD8E1e66f8a7`](https://explorer.hpp.io/address/0x661aA4D2B0e3348125DEe6E75A28aD8E1e66f8a7) |
| WETH (canonical) | [`0x82553CDA0bEd9262a879F9F7524cd20288B357AA`](https://explorer.hpp.io/address/0x82553CDA0bEd9262a879F9F7524cd20288B357AA) |

## Monorepo layout

| Path | What | License |
|---|---|---|
| `apps/web` | React 19 + Vite + wagmi/viem DEX frontend, deployed to `hppy.ai` | MIT |
| `apps/docs` | Astro + Starlight documentation site, deployed to `docs.hppy.ai` — includes `/llms.txt` and the agent-facing manifest/selector catalog | MIT |
| `packages/sdk` | `@hppyswap/sdk` — chain definition, ABIs, deployed addresses, AMM math; single source of truth consumed by both apps | MIT |
| `contracts` | Foundry project — vendored Uniswap V2 fork (core + periphery + WETH9), tests, and the local-only deploy script. Not a pnpm workspace member | GPL-3.0-or-later |

## Quick start

Prerequisites: Node.js >=24 (see `.nvmrc`), pnpm 11.13.0 (pinned via
`packageManager` in the root `package.json`), and [Foundry](https://book.getfoundry.sh/)
(`forge`, `anvil`, `cast`) if you're working on `contracts/`.

```bash
corepack enable && corepack prepare pnpm@latest --activate

git clone https://github.com/ultrafellen/hppyswap.git
cd hppyswap
pnpm install

# DEX frontend dev server
pnpm --filter hppyswap-web dev

# Docs site dev server
pnpm --filter hppyswap-docs dev
```

## For AI Agents

HPPYSwap treats AI agents as first-class users, not an afterthought: read
machine-readable facts from the manifest, call the router contract directly
with a library like viem, or drive the web UI itself — every interactive
element carries a stable `data-agent` selector and every status message is
exposed as `aria-live` DOM text, not a spinner or a color.

| Resource | URL |
|---|---|
| `llms.txt` | `https://docs.hppy.ai/llms.txt` |
| Agent manifest | `https://docs.hppy.ai/agents/hppyswap.json` |
| UI selector catalog | `https://docs.hppy.ai/agents/ui-selectors/` |

See [Live](#live) for the deployed URLs.

## Development

```bash
pnpm -r typecheck   # tsc --noEmit, per workspace (docs included — a scoped tsc pass, not `astro check`)
pnpm -r test        # vitest run, per workspace
pnpm -r build       # tsc + vite build / astro build / tsc --noEmit

# Contracts (Foundry, from contracts/)
cd contracts
forge build
forge test -vv
```

CI (`.github/workflows/ci.yml`) runs on every push and pull request: a JS
job (`pnpm typecheck`, `pnpm test`, `pnpm build`) and a contracts job
(`forge build`, `forge test -vv`).

## Deployment

`apps/web` and `apps/docs` deploy automatically to Cloudflare Workers via
GitHub Actions (`.github/workflows/deploy.yml`) on every push to `main` —
path-filtered, so only the app(s) actually affected by a change (or a
shared `packages/sdk` change) redeploy.

Contract deployment is a manual, one-time, local operation — never run in
CI, and no deployer private key is ever stored as a CI secret. See
[`contracts/README.md`](./contracts/README.md) for the full walkthrough.

## License

HPPYSwap is dual-licensed: the smart contracts in `contracts/` are
GPL-3.0-or-later (derived from Uniswap V2); everything else is MIT.
