// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightLlmsTxt from "starlight-llms-txt";

// https://astro.build/config
export default defineConfig({
  site: "https://docs.hppy.ai",
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
