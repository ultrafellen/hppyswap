// SPDX-License-Identifier: MIT
import { useEffect, useMemo, useState } from "react";
import { useBalance, useConnection, useReadContract, useReadContracts } from "wagmi";
import {
  ADDRESSES,
  DEFAULT_TOKENS,
  ROUTE_BASE_TOKENS,
  combineImpactBps,
  erc20Abi,
  getAmountOut,
  hpp,
  isDeployed,
  priceImpactBps,
  routerAbi,
  type TokenInfo,
} from "@hppyswap/sdk";
import { AmountInput } from "../components/AmountInput";
import { TokenSelect } from "../components/TokenSelect";
import { SettingsPopover } from "../components/SettingsPopover";
import { StatusLine, type StatusTone } from "../components/StatusLine";
import { usePair } from "../hooks/usePair";
import { useSwap } from "../hooks/useSwap";
import { formatAmount, parseAmount, toPlainAmount } from "../lib/format";
import { buildCandidatePaths, pickBestRoute } from "../lib/routing";

const HIGH_IMPACT_BPS = 1500;
const WARN_IMPACT_BPS = 500;
// Total label+dots width the dot-leader rows pad to, so "quote"/"impact"/
// "route" (5/6/5 chars) all land on the same column — matches the approved
// composite mockup (e.g. "quote ....... 1 ETH = ...").
const DOT_LEADER_WIDTH = 12;

// Route bases and their display symbols come straight from the sdk's
// ROUTE_BASE_TOKENS — deliberately NOT resolved by looking each address up
// in DEFAULT_TOKENS, since the WETH route base shares its address with
// NATIVE_ETH there and would resolve to the symbol "ETH", making a
// via-WETH route display the misleading "via ETH" (only WETH itself moves
// mid-route). Module scope: ROUTE_BASE_TOKENS never changes at runtime, so
// the number of usePair calls it drives below is computed once, not per
// render. Exactly 2 entries by design (packages/sdk/src/tokens.ts); the two
// hop reads below are unrolled rather than mapped so the useSwap-page's
// hook call count stays static across renders (rules-of-hooks).
const ROUTE_BASE_0 = ROUTE_BASE_TOKENS[0];
const ROUTE_BASE_1 = ROUTE_BASE_TOKENS[1];

function dotLeader(label: string): string {
  return `${label} ${".".repeat(Math.max(1, DOT_LEADER_WIDTH - label.length))}`;
}

export function SwapPage() {
  const deployed = isDeployed();
  const { address: owner, isConnected } = useConnection();

  const [tokenIn, setTokenIn] = useState<TokenInfo>(DEFAULT_TOKENS[0]);
  const [tokenOut, setTokenOut] = useState<TokenInfo | null>(null);
  const [amountInText, setAmountInText] = useState("");
  const [impactConfirmed, setImpactConfirmed] = useState(false);

  const amountIn = useMemo(
    () => parseAmount(amountInText, tokenIn.decimals),
    [amountInText, tokenIn.decimals],
  );

  // Direct-pair reserves — still needed for the no-amount reserve preview
  // below and for a direct route's own price impact.
  const pair = usePair(tokenIn.address, tokenOut?.address);

  // Reserves for each route base's two hops, so a confirmed via-route's
  // impact can be computed without extra RPC calls once quoting has picked
  // it (Task 17). Unused hop reads (base equals tokenIn/tokenOut, or no
  // route ends up using that base) simply stay disabled inside usePair.
  const hopIn0 = usePair(tokenIn.address, ROUTE_BASE_0.address);
  const hopOut0 = usePair(ROUTE_BASE_0.address, tokenOut?.address);
  const hopIn1 = usePair(tokenIn.address, ROUTE_BASE_1.address);
  const hopOut1 = usePair(ROUTE_BASE_1.address, tokenOut?.address);

  // Every path worth quoting: direct first, then one 2-hop candidate per
  // route base (skipping a base that's already tokenIn/tokenOut).
  const candidates = useMemo(
    () => (tokenOut ? buildCandidatePaths(tokenIn.address, tokenOut.address, ROUTE_BASE_TOKENS) : []),
    [tokenIn.address, tokenOut?.address],
  );

  const quoteEnabled = deployed && candidates.length > 0 && !!amountIn && amountIn > 0n;
  const { data: quotesData, isLoading: isQuotesLoading } = useReadContracts({
    contracts: candidates.map(
      (c) =>
        ({
          address: ADDRESSES.router,
          abi: routerAbi,
          functionName: "getAmountsOut",
          args: [amountIn ?? 0n, c.path],
        }) as const,
    ),
    query: { enabled: quoteEnabled },
  });

  // Each candidate's full router-quoted amounts (per-hop, not just the
  // final output) — a failed candidate (no pool on one of its hops) reads
  // as `null` rather than throwing, so one dead path can't sink the batch.
  const quoted = useMemo(
    () =>
      candidates.map((candidate, i) => {
        const result = quotesData?.[i];
        const amounts = result?.status === "success" ? result.result : null;
        return { candidate, amountOut: amounts ? amounts[amounts.length - 1] : null, amounts };
      }),
    [candidates, quotesData],
  );

  const best = useMemo(() => pickBestRoute(quoted), [quoted]);
  const bestAmounts = useMemo(
    () => (best ? (quoted.find((q) => q.candidate === best.candidate)?.amounts ?? null) : null),
    [best, quoted],
  );
  const quotedOut: bigint | null = best?.amountOut ?? null;

  // Rate shown on the "quote" line: the router-quoted rate for the current
  // amount when one is typed, else a reserve-based unit-rate preview from
  // the direct pair (both use the same constant-product formula, so they
  // agree once amountIn>0 for a direct route).
  const displayRate = useMemo(() => {
    if (!tokenOut) return null;
    const unit = 10n ** BigInt(tokenIn.decimals);
    if (amountIn && amountIn > 0n && quotedOut != null) {
      return (quotedOut * unit) / amountIn;
    }
    if (pair.reserves && pair.reserves.reserveA > 0n && pair.reserves.reserveB > 0n) {
      try {
        return getAmountOut(unit, pair.reserves.reserveA, pair.reserves.reserveB);
      } catch {
        return null;
      }
    }
    return null;
  }, [tokenOut, amountIn, quotedOut, pair.reserves, tokenIn.decimals]);

  // `null` means "not yet known" — either no route has resolved yet, or one
  // has (quotedOut is set) but the reserves needed to price its impact
  // haven't loaded (a separate set of RPC reads from the router's
  // getAmountsOut quote, so it can lag behind by a render or two). Callers
  // must treat null as "don't know", not as zero impact — showing 0.00%
  // during that window is exactly the bug this type distinguishes against.
  const impactBps = useMemo<number | null>(() => {
    if (!amountIn || amountIn <= 0n) return 0;
    if (!best) return null;
    try {
      if (best.candidate.kind === "direct") {
        if (!pair.reserves) return null;
        return priceImpactBps(amountIn, pair.reserves.reserveA, pair.reserves.reserveB);
      }
      // via: each hop's own impact, from its own reserves and the amount
      // the router actually quoted flowing through it (bestAmounts[0] into
      // hop 1, the router-quoted intermediate bestAmounts[1] into hop 2),
      // combined multiplicatively rather than summed.
      const baseAddress = best.candidate.path[1];
      const hops =
        baseAddress.toLowerCase() === ROUTE_BASE_0.address.toLowerCase()
          ? { in: hopIn0, out: hopOut0 }
          : { in: hopIn1, out: hopOut1 };
      if (!hops.in.reserves || !hops.out.reserves || !bestAmounts) return null;
      const hop1Impact = priceImpactBps(bestAmounts[0], hops.in.reserves.reserveA, hops.in.reserves.reserveB);
      const hop2Impact = priceImpactBps(bestAmounts[1], hops.out.reserves.reserveA, hops.out.reserves.reserveB);
      return combineImpactBps([hop1Impact, hop2Impact]);
    } catch {
      return null;
    }
  }, [amountIn, best, bestAmounts, pair.reserves, hopIn0.reserves, hopOut0.reserves, hopIn1.reserves, hopOut1.reserves]);

  const highImpact = impactBps != null && impactBps > HIGH_IMPACT_BPS;
  const warnImpact = impactBps != null && impactBps > WARN_IMPACT_BPS;
  // True only in the specific window described above: a route has resolved
  // (quotedOut exists) but its impact hasn't. Gates execute (below) so a
  // high-impact via-route can't slip past the warn/confirm step just
  // because its reserves read hadn't landed yet.
  const impactUnknown = best != null && impactBps == null;

  // A fresh amount/pair always needs a fresh high-impact confirmation.
  useEffect(() => {
    setImpactConfirmed(false);
  }, [tokenIn.address, tokenOut?.address, amountInText]);

  const { swap, status: swapStatus, error: swapError, reset: resetSwapStatus } = useSwap();

  // A terminal swap status (success/error) shouldn't linger once the user
  // starts editing a new swap — otherwise the aria-live region keeps
  // announcing e.g. "swap complete" while they set up the next trade.
  // Deliberately NOT an effect on amountInText: handleExecute clears the
  // input programmatically after success, and an effect would wipe the
  // "swap complete" announcement in the same frame. Instead the USER input
  // handlers below (amount typing, token selects, flip, max) call
  // resetSwapStatus() directly; `reset` itself guards against clobbering an
  // in-flight approve/pending.
  function handleAmountChange(text: string) {
    resetSwapStatus();
    setAmountInText(text);
  }

  function handleSelectTokenIn(t: TokenInfo) {
    resetSwapStatus();
    setTokenIn(t);
  }

  function handleSelectTokenOut(t: TokenInfo) {
    resetSwapStatus();
    setTokenOut(t);
  }

  // "No route" only once quoting has actually been attempted (needs a
  // typed amount — getAmountsOut can't quote a zero input) and settled;
  // before that, a fresh token selection simply shows no error yet rather
  // than guessing.
  const noRoute = deployed && !!tokenOut && quoteEnabled && !isQuotesLoading && best === null;

  // wagmi 3's useBalance is native-currency-only (no ERC20 `token` param —
  // that was a v1/v2 feature); ERC20 balances are read directly via
  // erc20Abi's balanceOf instead.
  const nativeBalanceQuery = useBalance({
    address: owner,
    chainId: hpp.id,
    query: { enabled: isConnected && !!owner && tokenIn.isNative },
  });
  const { data: erc20BalanceValue } = useReadContract({
    address: tokenIn.isNative ? undefined : tokenIn.address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: owner ? [owner] : undefined,
    query: { enabled: isConnected && !!owner && !tokenIn.isNative },
  });
  const balance = tokenIn.isNative
    ? nativeBalanceQuery.data
      ? { value: nativeBalanceQuery.data.value, decimals: nativeBalanceQuery.data.decimals }
      : null
    : erc20BalanceValue != null
      ? { value: erc20BalanceValue, decimals: tokenIn.decimals }
      : null;

  function handleFlip() {
    if (!tokenOut) return;
    resetSwapStatus();
    const nextIn = tokenOut;
    const nextOut = tokenIn;
    setTokenIn(nextIn);
    setTokenOut(nextOut);
    setAmountInText("");
  }

  function handleMax() {
    if (!balance) return;
    resetSwapStatus();
    setAmountInText(toPlainAmount(balance.value, balance.decimals));
  }

  const busy = swapStatus === "approving" || swapStatus === "pending";
  const inputsDisabled = !deployed || busy;

  async function handleExecute() {
    if (highImpact && !impactConfirmed) {
      setImpactConfirmed(true);
      return;
    }
    if (!tokenOut || !amountIn || amountIn <= 0n || !best) return;
    try {
      await swap({ tokenIn, tokenOut, amountIn, quotedOut: best.amountOut, path: best.candidate.path });
      setAmountInText("");
      setImpactConfirmed(false);
    } catch {
      // useSwap already captured status/error for the swap-status region.
    }
  }

  const executeDisabled =
    inputsDisabled ||
    !isConnected ||
    !tokenOut ||
    !amountIn ||
    amountIn <= 0n ||
    noRoute ||
    // Without this, a route that resolves before its impact reserves do
    // would fall through here with quotedOut != null and highImpact still
    // false (impactBps unknown reads as "not high"), enabling execute
    // during the exact window the warn/confirm gate exists to catch.
    impactUnknown ||
    (quotedOut == null && !(highImpact && !impactConfirmed));

  const executeLabel = highImpact && !impactConfirmed ? "confirm high impact" : "execute swap ↵";

  // The route line: the confirmed best route once one's been quoted, else a
  // neutral "direct" placeholder (matches what an amount-less selection
  // showed before Task 17 — it flips to the real route, "via …" included,
  // the moment an amount resolves a quote).
  const routeLabel = !tokenOut
    ? "—"
    : best && best.candidate.kind === "via"
      ? `via ${best.candidate.baseSymbol}`
      : `direct (${tokenIn.symbol}/${tokenOut.symbol})`;

  function statusMessage(): { message: string; tone: StatusTone } {
    if (!deployed) return { message: "contracts not deployed yet — see docs.hppy.ai", tone: "error" };
    if (noRoute) return { message: "no route for this pair — create a pool in pools", tone: "error" };
    if (swapStatus === "approving") return { message: "approving token spend…", tone: "info" };
    if (swapStatus === "pending") return { message: "swap pending — waiting for confirmation…", tone: "info" };
    if (swapStatus === "success") return { message: "swap complete", tone: "success" };
    if (swapStatus === "error" && swapError) return { message: swapError, tone: "error" };
    if (!isConnected && tokenOut) return { message: "connect a wallet to swap", tone: "info" };
    if (highImpact && !impactConfirmed) {
      return { message: "price impact is high — confirm to proceed", tone: "error" };
    }
    return { message: "", tone: "info" };
  }

  return (
    <div className="swap-page">
      <div className="swap-header-line">
        <span className="swap-comment">// swap on hpp mainnet</span>
        <SettingsPopover />
      </div>

      <div className="swap-card">
        <div className="swap-side">
          <div className="swap-side-label">&gt; sell</div>
          <div className="swap-side-row">
            <AmountInput
              value={amountInText}
              onChange={handleAmountChange}
              decimals={tokenIn.decimals}
              disabled={inputsDisabled}
              dataAgent="swap-amount-in"
            />
            <TokenSelect
              token={tokenIn}
              onSelect={handleSelectTokenIn}
              dataAgent="swap-token-in"
              disabled={inputsDisabled}
              excludeAddress={tokenOut?.address}
            />
          </div>
          <div className="swap-side-balance">
            balance {balance ? formatAmount(balance.value, balance.decimals, 6) : "—"} {tokenIn.symbol}
            <button
              type="button"
              className="max-button"
              data-agent="swap-max"
              onClick={handleMax}
              disabled={inputsDisabled || !balance}
            >
              max
            </button>
          </div>
        </div>

        <button
          type="button"
          className="flip-button"
          data-agent="swap-direction-flip"
          onClick={handleFlip}
          disabled={inputsDisabled || !tokenOut}
          aria-label="flip sell and buy tokens"
        >
          ↓
        </button>

        <div className="swap-side">
          <div className="swap-side-label">&gt; buy</div>
          <div className="swap-side-row">
            <AmountInput
              value={tokenOut && quotedOut != null ? formatAmount(quotedOut, tokenOut.decimals, 6) : ""}
              decimals={tokenOut?.decimals ?? 18}
              readOnly
              disabled={inputsDisabled}
              placeholder="0.0"
              dataAgent="swap-amount-out"
            />
            <TokenSelect
              token={tokenOut}
              onSelect={handleSelectTokenOut}
              dataAgent="swap-token-out"
              disabled={inputsDisabled}
              excludeAddress={tokenIn.address}
            />
          </div>
        </div>
      </div>

      <div className="quote-block">
        <div className="quote-row" data-agent="swap-quote-line">
          <span className="quote-label">{dotLeader("quote")}</span>
          <span className="quote-value">
            {tokenOut && displayRate != null
              ? `1 ${tokenIn.symbol} = ${formatAmount(displayRate, tokenOut.decimals, 4)} ${tokenOut.symbol}`
              : "—"}
          </span>
        </div>
        <div className="quote-row">
          <span className="quote-label">{dotLeader("impact")}</span>
          <span
            className={warnImpact ? "quote-value quote-value-warn" : "quote-value"}
            data-agent="swap-impact"
          >
            {amountIn && amountIn > 0n && impactBps != null
              ? `${(impactBps / 100).toFixed(2)}%${warnImpact ? " ⚠ high impact" : ""}`
              : "—"}
          </span>
        </div>
        <div className="quote-row" data-agent="swap-route">
          <span className="quote-label">{dotLeader("route")}</span>
          <span className="quote-value">{routeLabel}</span>
        </div>
      </div>

      <button
        type="button"
        className="execute-button"
        data-agent="swap-execute"
        disabled={executeDisabled}
        onClick={handleExecute}
      >
        {executeLabel}
      </button>

      <StatusLine {...statusMessage()} dataAgent="swap-status" />
    </div>
  );
}
