// SPDX-License-Identifier: MIT
import type { ReactNode } from "react";
import { Link } from "react-router";
import { Logo } from "./Logo";
import { ConnectButton } from "./ConnectButton";
import { RpcIndicator } from "./RpcIndicator";

const DOCS_URL = "https://docs.hppy.ai";
// Points at the real page directly (belt and braces alongside the
// astro.config.mjs `/agents` -> `/agents/overview` redirect).
const AGENTS_DOCS_URL = "https://docs.hppy.ai/agents/overview/";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="site-header">
        <nav className="site-nav" aria-label="primary">
          <Logo />
          <div className="nav-links">
            <Link to="/" data-agent="nav-swap">
              swap
            </Link>
            <Link to="/pools" data-agent="nav-pools">
              pools
            </Link>
            <a href={DOCS_URL} target="_blank" rel="noreferrer" data-agent="nav-docs">
              docs
            </a>
            <RpcIndicator />
            <ConnectButton />
          </div>
        </nav>
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        built for agents ·{" "}
        <a href={AGENTS_DOCS_URL} target="_blank" rel="noreferrer">
          docs.hppy.ai/agents
        </a>
      </footer>
    </>
  );
}
