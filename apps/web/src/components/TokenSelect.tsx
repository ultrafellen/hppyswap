// SPDX-License-Identifier: MIT
import { useMemo, useState } from "react";
import { useReadContracts } from "wagmi";
import { isAddress, type Address } from "viem";
import { DEFAULT_TOKENS, erc20Abi, type TokenInfo } from "@hppyswap/sdk";
import { addCustomToken, loadCustomTokens } from "../lib/customTokens";

export type TokenSelectProps = {
  token: TokenInfo | null;
  onSelect: (token: TokenInfo) => void;
  /** data-agent for the trigger button — pass "swap-token-in" / "swap-token-out" per the selector catalog. */
  dataAgent: string;
  disabled?: boolean;
  /** Hides this address from the picker list (e.g. the token already chosen on the other side). */
  excludeAddress?: Address;
};

/**
 * Token picker: DEFAULT_TOKENS plus a localStorage-persisted custom list,
 * with an "import by address" field that reads symbol/decimals live via
 * erc20Abi and adds the result to the custom list (key `hppyswap.tokens.v1`).
 */
export function TokenSelect({ token, onSelect, dataAgent, disabled, excludeAddress }: TokenSelectProps) {
  const [open, setOpen] = useState(false);
  const [customTokens, setCustomTokens] = useState<TokenInfo[]>(() => loadCustomTokens());
  const [importAddress, setImportAddress] = useState("");

  const trimmedImport = importAddress.trim();
  const importIsValidAddress = isAddress(trimmedImport);

  const { data: importData, isFetching: isImporting } = useReadContracts({
    contracts: importIsValidAddress
      ? [
          { address: trimmedImport as Address, abi: erc20Abi, functionName: "symbol" },
          { address: trimmedImport as Address, abi: erc20Abi, functionName: "decimals" },
          { address: trimmedImport as Address, abi: erc20Abi, functionName: "name" },
        ]
      : [],
    query: { enabled: importIsValidAddress },
  });

  const importOk =
    importIsValidAddress && importData?.[0]?.status === "success" && importData?.[1]?.status === "success";
  const importFailed =
    importIsValidAddress && importData != null && !importOk && !isImporting;

  const allTokens = useMemo(() => {
    const seen = new Set(DEFAULT_TOKENS.map((t) => t.address.toLowerCase()));
    const merged = [...DEFAULT_TOKENS];
    for (const t of customTokens) {
      const key = t.address.toLowerCase();
      if (!seen.has(key)) {
        merged.push(t);
        seen.add(key);
      }
    }
    return merged;
  }, [customTokens]);

  const visibleTokens = excludeAddress
    ? allTokens.filter((t) => t.address.toLowerCase() !== excludeAddress.toLowerCase())
    : allTokens;

  function handleSelect(t: TokenInfo) {
    onSelect(t);
    setOpen(false);
  }

  function handleImport() {
    if (!importOk || !importData) return;
    const symbolRes = importData[0];
    const decimalsRes = importData[1];
    const nameRes = importData[2];
    if (!symbolRes || symbolRes.status !== "success") return;
    if (!decimalsRes || decimalsRes.status !== "success") return;
    const imported: TokenInfo = {
      address: trimmedImport as Address,
      symbol: symbolRes.result,
      name: nameRes && nameRes.status === "success" ? nameRes.result : symbolRes.result,
      decimals: decimalsRes.result,
    };
    setCustomTokens(addCustomToken(imported));
    setImportAddress("");
    handleSelect(imported);
  }

  return (
    <div className="token-select-wrap">
      <button
        type="button"
        className="token-select-trigger"
        data-agent={dataAgent}
        disabled={disabled}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {token ? token.symbol : "select token"} ▾
      </button>
      {open && (
        <div className="token-select-panel" role="group" aria-label="select token">
          <ul className="token-list">
            {visibleTokens.map((t) => (
              <li key={t.address}>
                <button type="button" onClick={() => handleSelect(t)}>
                  {t.symbol} — {t.name}
                </button>
              </li>
            ))}
            {visibleTokens.length === 0 && <li className="token-list-empty">no tokens available</li>}
          </ul>
          <div className="token-import">
            <label className="token-import-label">
              import by address
              <input
                type="text"
                value={importAddress}
                placeholder="0x…"
                data-agent={`${dataAgent}-import`}
                onChange={(e) => setImportAddress(e.target.value)}
              />
            </label>
            <button type="button" onClick={handleImport} disabled={!importOk}>
              {isImporting ? "looking up…" : "add token"}
            </button>
            {importFailed && (
              <p role="alert" className="token-import-error">
                no ERC20 token found at this address
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
