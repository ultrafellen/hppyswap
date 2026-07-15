// SPDX-License-Identifier: MIT
import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { Logo } from "./Logo";
import { ConnectButton } from "./ConnectButton";
import { applyTheme, persistTheme, readStoredTheme, toggleTheme } from "../lib/theme";

const DOCS_URL = "https://docs.hppy.ai";
// Points at the real page directly (belt and braces alongside the
// astro.config.mjs `/agents` -> `/agents/overview` redirect).
const AGENTS_DOCS_URL = "https://docs.hppy.ai/agents/overview/";

function ThemeToggle() {
  // The pre-paint inline script in index.html already applied the stored
  // theme to <html> before React mounted, so reading storage here (rather
  // than the DOM) reflects the same value and keeps this component pure.
  const [theme, setTheme] = useState(readStoredTheme);

  const handleToggle = () => {
    const next = toggleTheme(theme);
    applyTheme(next);
    persistTheme(next);
    setTheme(next);
  };

  return (
    <button type="button" className="theme-toggle" data-agent="theme-toggle" onClick={handleToggle}>
      {theme === "light" ? "light" : "dark"}
    </button>
  );
}

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
            <ThemeToggle />
            <ConnectButton />
          </div>
        </nav>
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        built for humans &amp; agents ·{" "}
        <a href={AGENTS_DOCS_URL} target="_blank" rel="noreferrer">
          docs.hppy.ai/agents
        </a>
      </footer>
    </>
  );
}
