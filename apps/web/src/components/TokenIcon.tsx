// SPDX-License-Identifier: MIT

export type TokenIconProps = {
  symbol: string;
  /** Root-relative icon path (`TokenInfo.logoURI`, packages/sdk/src/tokens.ts). Absent for custom-imported tokens — falls back to a lettered circle, CSS only, no network request. */
  logoURI?: string;
};

/**
 * 20px token icon shared by the token picker and the pools pages (Task 18).
 * Purely decorative next to a visible symbol string, so it's `alt=""` /
 * `aria-hidden` rather than announced by itself — screen readers already get
 * the symbol from the adjacent text. Self-hosted images only
 * (`apps/web/public/tokens/`), never a third-party URL, so this never adds a
 * runtime dependency on an external host.
 */
export function TokenIcon({ symbol, logoURI }: TokenIconProps) {
  if (logoURI) {
    return (
      <img
        className="token-icon token-icon-img"
        src={logoURI}
        alt=""
        aria-hidden="true"
        width={20}
        height={20}
      />
    );
  }
  return (
    <span className="token-icon token-icon-fallback" aria-hidden="true">
      {symbol.charAt(0).toUpperCase()}
    </span>
  );
}
