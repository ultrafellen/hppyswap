// SPDX-License-Identifier: MIT
import { defineConfig, configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    // ./e2e is the Playwright selector-contract suite (apps/web/playwright.config.ts,
    // run via `pnpm test:e2e`) — it uses its own `test`/`expect` from
    // @playwright/test, not vitest's, and hits the real mainnet RPC, so it
    // must never be picked up by vitest's default *.spec.ts discovery here.
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
