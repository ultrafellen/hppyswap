// SPDX-License-Identifier: MIT
//
// This suite is the executable form of docs.hppy.ai/agents/ui-selectors
// (v1.4). A failure here means the published agent contract is broken —
// fix the app or bump the catalog + changelog, never silently.
//
// Quote-only, real mainnet reads: every assertion below drives the actual
// production build (`pnpm build` + `vite preview`) against the live HPP
// Mainnet RPC (chainId 190415, packages/sdk's `hpp` chain). There is no
// wallet connection and no transaction signing anywhere in this file — only
// the connect/switch-chain *affordances* are checked for presence, never
// exercised. Each `test()` below is grouped by, and cites, the catalog
// section it turns into assertions.
import { expect, test } from "@playwright/test";

// packages/sdk/src/tokens.ts's HPP — verified on-chain 2026-07-15 (Task 16
// mainnet deployment). Matches the catalog's own worked example.
const HPP_ADDRESS = "0xB48334E7938367bC24Fe1F19000D6f06C622E6c7";
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

test.describe("Global (every page) — catalog §Global", () => {
  test("nav / theme / wallet / status selectors are present on /, theme-toggle flips + persists", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.locator('[data-agent="nav-home"]')).toBeVisible();
    await expect(page.locator('[data-agent="nav-swap"]')).toBeVisible();
    await expect(page.locator('[data-agent="nav-pools"]')).toBeVisible();
    await expect(page.locator('[data-agent="nav-docs"]')).toBeVisible();
    await expect(page.locator('[data-agent="theme-toggle"]')).toBeVisible();
    await expect(page.locator('[data-agent="wallet-connect"]')).toBeVisible();

    // catalog: `status-line` is documented as "the underlying pattern" —
    // every concrete page overrides the data-agent to a page-specific name
    // (swap-status/pools-status/liq-status) and none of them literally
    // renders data-agent="status-line" (see StatusLine.tsx's own doc
    // comment). On `/` that concrete override is `swap-status`, which
    // shares the pattern's defining trait: an aria-live="polite"
    // role="status" region. Assert the pattern itself here; the concrete
    // `swap-status` selector is asserted by name in the swap-flow test
    // below.
    const status = page.getByRole("status");
    await expect(status).toBeVisible();
    await expect(status).toHaveAttribute("aria-live", "polite");

    // theme-toggle flips document.documentElement.dataset.theme and
    // persists to localStorage `hppyswap.theme` (catalog: Global table).
    const before = await page.evaluate(() => document.documentElement.dataset.theme ?? "dark");
    await page.locator('[data-agent="theme-toggle"]').click();
    const after = await page.evaluate(() => document.documentElement.dataset.theme ?? "dark");
    expect(after).not.toBe(before);
    const stored = await page.evaluate(() => localStorage.getItem("hppyswap.theme"));
    expect(stored).toBe(after);
  });
});

test.describe("Swap (/) — catalog §Swap", () => {
  test("quoting a real ETH -> HPP route populates the quote/impact/route/usd selectors", async ({ page }) => {
    // Several sequential RPC round trips against a public, rate-limited
    // mainnet RPC (candidate quotes, per-hop reserves, USD-anchor prices) —
    // more headroom than the config default.
    test.setTimeout(120_000);

    await page.goto("/");

    // swap-token-out -> token-option list is non-empty, each carries a
    // data-address contract address.
    await page.locator('[data-agent="swap-token-out"]').click();
    const options = page.locator('[data-agent="token-option"]');
    await expect(options.first()).toBeVisible();
    const optionCount = await options.count();
    expect(optionCount).toBeGreaterThan(0);
    for (let i = 0; i < optionCount; i++) {
      await expect(options.nth(i)).toHaveAttribute("data-address", ADDRESS_RE);
    }

    // Pick HPP as the buy token.
    await page.locator(`[data-agent="token-option"][data-address="${HPP_ADDRESS}"]`).click();

    // Sell side defaults to ETH (DEFAULT_TOKENS[0]); no direct ETH/HPP pool
    // exists on-chain today, only USDC.e/WETH and USDC.e/HPP, so the router
    // is expected to resolve a via-USDC.e route for this pair.
    await page.locator('[data-agent="swap-amount-in"]').fill("0.001");

    const routeLine = page.locator('[data-agent="swap-route"]');
    await expect(routeLine).toContainText(/via|direct/, { timeout: 60_000 });

    // swap-quote-line shows a resolved rate ("1 TOKEN_IN = X TOKEN_OUT"),
    // not the "—" no-route placeholder.
    const quoteLine = page.locator('[data-agent="swap-quote-line"]');
    await expect(quoteLine).toContainText("=", { timeout: 60_000 });

    // swap-impact: the catalog's documented loading state is a literal "—"
    // before the impact reserves resolve; this only asserts the eventual
    // "%" state, allowing (not requiring) that transient placeholder first.
    const impact = page.locator('[data-agent="swap-impact"]');
    await expect(impact).toContainText("%", { timeout: 60_000 });

    // swap-usd-in shows a USD conversion once an amount is typed.
    const usdIn = page.locator('[data-agent="swap-usd-in"]');
    await expect(usdIn).toContainText("$", { timeout: 60_000 });

    // swap-amount-out (read-only) is populated with the quoted amount.
    const amountOut = page.locator('[data-agent="swap-amount-out"]');
    await expect(amountOut).not.toHaveValue("", { timeout: 60_000 });

    // swap-status is the aria-live="polite" role="status" region (catalog:
    // "State via DOM text, not visual state").
    const status = page.locator('[data-agent="swap-status"]');
    await expect(status).toHaveAttribute("role", "status");
    await expect(status).toHaveAttribute("aria-live", "polite");
  });
});

test.describe("Pools (/pools) — catalog §Pools", () => {
  test("pools-table lists real on-chain pools with tvl and a create link", async ({ page }) => {
    test.setTimeout(90_000);

    await page.goto("/pools");

    await expect(page.locator('[data-agent="pools-table"]')).toBeVisible({ timeout: 60_000 });

    const rows = page.locator('[data-agent="pool-row"]');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(1);

    for (let i = 0; i < rowCount; i++) {
      // Each pool-row carries the pair contract address (catalog: also used
      // to navigate to /pools/:pairAddress).
      await expect(rows.nth(i)).toHaveAttribute("data-pair", ADDRESS_RE);
    }

    // Each row's tvl cell renders either a resolved "$…" USD figure or the
    // catalog's documented "—" no-route placeholder (catalog: pool-tvl
    // renders "—" both while the USD price is still loading and, terminally,
    // when no route exists for one or both sides — the two are visually
    // indistinguishable, by design: "—" is a legitimate steady state, not a
    // spinner). So we can't demand every row eventually show "$" without
    // risking a false failure on a pool with no USD route. Instead: wait
    // (with the same real budget as before) for at least one row to resolve
    // to "$" — today's live pools are all USDC.e-paired, so this is
    // guaranteed and keeps the USD-pricing path genuinely exercised — then
    // snapshot every row and accept either literal state per row.
    const tvlCells = page.locator('[data-agent="pool-tvl"]');
    await expect(tvlCells.filter({ hasText: "$" }).first()).toBeVisible({ timeout: 60_000 });

    let dollarRowCount = 0;
    for (let i = 0; i < rowCount; i++) {
      const text = (await tvlCells.nth(i).textContent()) ?? "";
      expect(text === "—" || text.includes("$")).toBe(true);
      if (text.includes("$")) dollarRowCount++;
    }
    expect(dollarRowCount).toBeGreaterThan(0);

    await expect(page.locator('[data-agent="pools-create"]')).toBeVisible();
  });
});

test.describe("Pool detail (/pools/:pairAddress) — catalog §Pool detail", () => {
  test("clicking the first pool exposes reserves/amount/status/remove-percent selectors", async ({ page }) => {
    test.setTimeout(120_000);

    await page.goto("/pools");
    const firstRow = page.locator('[data-agent="pool-row"]').first();
    await expect(firstRow).toBeVisible({ timeout: 60_000 });
    await firstRow.locator("a").click();

    await expect(page).toHaveURL(/\/pools\/0x[a-fA-F0-9]{40}/);

    await expect(page.locator('[data-agent="liq-reserves"]')).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('[data-agent="liq-amount-a"]')).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('[data-agent="liq-amount-b"]')).toBeVisible({ timeout: 60_000 });

    const status = page.locator('[data-agent="liq-status"]');
    await expect(status).toHaveAttribute("role", "status");
    await expect(status).toHaveAttribute("aria-live", "polite");

    // liq-remove-percent: exactly 4 real <button> presets, 25/50/75/100.
    const percentButtons = page.locator('[data-agent="liq-remove-percent"]');
    await expect(percentButtons).toHaveCount(4);
    const expectedPercents = ["25", "50", "75", "100"];
    for (let i = 0; i < expectedPercents.length; i++) {
      await expect(percentButtons.nth(i)).toHaveAttribute("data-percent", expectedPercents[i]);
      await expect(percentButtons.nth(i)).toHaveJSProperty("tagName", "BUTTON");
    }
  });
});
