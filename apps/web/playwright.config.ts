// SPDX-License-Identifier: MIT
import { defineConfig, devices } from "@playwright/test";

// This suite (./e2e) is the executable form of
// docs.hppy.ai/agents/ui-selectors (v1.3) — see e2e/selector-contract.spec.ts
// for the full rationale. It drives a production build served by `vite
// preview` against the real HPP Mainnet RPC (no wallet, quote-only reads),
// so timeouts/retries here are sized for a public, rate-limited RPC rather
// than a mocked backend.
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 20_000 },
  // Public mainnet RPC is rate-limited; a flaky read is retried rather than
  // failing the whole run outright.
  retries: 2,
  // Single worker: parallel workers would multiply concurrent RPC calls
  // against the same public endpoint.
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:4173",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // `preview` serves apps/web/dist, which must already be built (`pnpm
  // build`) before this config is used — see apps/web's test:e2e script
  // and the CI e2e job, both of which build first.
  webServer: {
    command: "pnpm preview --port 4173",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
  },
});
