# Contributing to HPPYSwap

Thanks for your interest in contributing. This guide covers dev setup, PR
expectations, and code style — for what the project *is*, see
[`README.md`](./README.md).

## Dev setup

Prerequisites:

| Tool | Version |
|---|---|
| Node.js | >=24 (see repo root `.nvmrc`) |
| pnpm | 11.13.0 (pinned via `packageManager` in root `package.json`) |
| Foundry (`forge`, `anvil`, `cast`) | latest stable — `curl -L https://foundry.paradigm.xyz \| bash && foundryup` |

```bash
corepack enable && corepack prepare pnpm@latest --activate

git clone https://github.com/ultrafellen/hppyswap.git
cd hppyswap
pnpm install
```

`pnpm install` links all `apps/*` and `packages/*` workspaces in one pass —
`@hppyswap/sdk` is consumed by `apps/web` and `apps/docs` via
`workspace:*`, so SDK changes are picked up immediately by both without a
publish step.

Run a single app's dev server:

```bash
pnpm --filter hppyswap-web dev    # DEX frontend, http://localhost:5173
pnpm --filter hppyswap-docs dev   # Starlight docs site
```

### Tests, per workspace

```bash
pnpm --filter hppyswap-web test        # vitest run (apps/web)
pnpm --filter @hppyswap/sdk test       # vitest run (packages/sdk)
cd contracts && forge test -vv         # Foundry test suite (contracts/)
```

`apps/docs` has no test suite (it's documentation content plus one API
route) — `pnpm --filter hppyswap-docs typecheck` is the relevant check
there.

From the repo root, `pnpm -r typecheck`, `pnpm -r test`, and `pnpm -r build`
run the equivalent check across every JS/TS workspace that defines it.

## PR rules

- **English only**, for commits, PR titles/descriptions, and code comments.
- **Commit messages are imperative, present tense**, following the
  `type(scope): summary` shape already used throughout the history, e.g.
  `feat(web): pool detail with add/remove liquidity flows`,
  `fix(docs): real typecheck for hand-written ts via scoped tsc`,
  `docs: complete README and contributing guide`. Common types: `feat`,
  `fix`, `docs`, `refactor`, `test`, `ci`.
- **CI must be green** before merge. `.github/workflows/ci.yml` runs a JS
  job (`pnpm typecheck`, `pnpm test`, `pnpm build`) and a contracts job
  (`forge build`, `forge test -vv`) on every push and pull request — both
  must pass.
- **Dependencies are pinned to exact versions.** `save-exact=true` in
  `.npmrc` enforces this for everything `pnpm add`s; don't hand-edit a
  `package.json` dependency to a `^`/`~` range. When adding or bumping a
  dependency, use its latest stable release and pin that exact version —
  don't pin an older version without a compatibility reason called out in
  the PR. If you intentionally need a version published very recently,
  add it to `minimumReleaseAgeExclude` in `pnpm-workspace.yaml`.

## Code style

The web app follows an **agent-operable UI** contract — every PR that
touches `apps/web` UI must keep it intact:

- **Semantic HTML only.** Real `<button>`, `<input>`, `<table>` elements —
  never a `<div onClick>` standing in for one.
- **`data-agent="…"` selectors** on every interactive or state-bearing
  element a person needs to complete a swap or manage liquidity. Purely
  decorative elements don't need one.
- **State as DOM text, not visual-only state.** Status and error messages
  live in an `aria-live="polite"` `role="status"` region's `textContent` —
  never a spinner-only or color-only signal. The same applies to warnings
  (e.g. price-impact): the meaning must be readable in the text itself, not
  inferred from a CSS class or color.
- **No hover-only interactions.** Anything a mouse-hover can trigger must
  also work via click/tap and keyboard focus — an agent driving the page
  via automation, or a person on a touch device, doesn't hover.

**Selector changes are breaking changes.** A `data-agent` rename, removal,
or semantic change must be recorded in the changelog at the bottom of
[`apps/docs/src/content/docs/agents/ui-selectors.md`](./apps/docs/src/content/docs/agents/ui-selectors.md)
**in the same pull request** that makes the change — that file is the
contract external agents rely on, and it must never fall out of sync with
the shipped app.

## Contracts

`contracts/` vendors [Uniswap V2](https://github.com/Uniswap/v2-core) (core,
periphery, WETH9) at Solidity 0.6.6. **Do not modify the vendored core or
periphery source files** — bug fixes or behavior changes belong in new code
layered on top (e.g. the Foundry test suite or deploy script), not in the
vendored contracts themselves, so the fork stays auditable against upstream.

Everything under `contracts/` is GPL-3.0-or-later (see `contracts/LICENSE`
and `contracts/README.md`), consistent with its Uniswap V2 origin — this
differs from the MIT license covering the rest of the monorepo.

Contract deployment is a manual, one-time, local operation, never run in
CI — see `contracts/README.md` for the full walkthrough if your change
touches the deploy script.
