// SPDX-License-Identifier: MIT
import { Link } from "react-router";

export function Logo() {
  return (
    <Link to="/" data-agent="nav-home" className="logo-link">
      <span aria-hidden="true" className="logo-tile">
        <span className="logo-gt">&gt;</span>
        <span className="logo-lt">&lt;</span>
      </span>
      <span className="logo-word">hppyswap</span>
    </Link>
  );
}
