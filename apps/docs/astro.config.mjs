// SPDX-License-Identifier: MIT
// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightLlmsTxt from "starlight-llms-txt";

// https://astro.build/config
export default defineConfig({
  site: "https://docs.hppy.ai",
  // Starlight 0.41's docsSchema strips unknown frontmatter keys — a
  // `redirect:` field on a page's frontmatter is silently dropped, so a
  // stub `agents/index.md` with that frontmatter builds as an empty page
  // instead of redirecting. Astro's own `redirects` config option is a
  // real redirect: for the static output this repo builds, it emits a
  // dist/agents/index.html with a meta-refresh (plus a Location header
  // when served through an adapter that supports it).
  redirects: {
    "/agents": "/agents/overview",
  },
  integrations: [
    starlight({
      title: "HPPYSwap Docs",
      description:
        "Docs for HPPYSwap, an AMM DEX on HPP Mainnet built for humans and AI agents alike.",
      social: [
        { icon: "github", label: "GitHub", href: "https://github.com/ultrafellen/hppyswap" },
      ],
      plugins: [starlightLlmsTxt()],
      sidebar: [
        { label: "Start", items: ["index", "connect-to-hpp"] },
        { label: "Guides", items: ["guides/swap", "guides/liquidity"] },
        {
          label: "Developers",
          items: ["dev/contracts", "dev/local-development", "dev/architecture"],
        },
        {
          label: "For AI Agents",
          items: ["agents/overview", "agents/onchain", "agents/ui-selectors"],
        },
      ],
    }),
  ],
});
