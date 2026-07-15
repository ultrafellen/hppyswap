// SPDX-License-Identifier: MIT
import { useEffect, useMemo, useState } from "react";
import { useBalance, useConnection, useReadContract } from "wagmi";
import type { Address } from "viem";
import {
  ADDRESSES,
  DEFAULT_TOKENS,
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

const HIGH_IMPACT_BPS = 1500;
const WARN_IMPACT_BPS = 500;
// Total label+dots width the dot-leader rows pad to, so "quote"/"impact"/
// "route" (5/6/5 chars) all land on the same column — matches the approved
// composite mockup (e.g. "quote ....... 1 ETH = ...").
const DOT_LEADER_WIDTH = 12;

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

  const pair = usePair(tokenIn.address, tokenOut?.address);

  const quoteEnabled =
    deployed && !!tokenOut && pair.pairAddress != null && !!amountIn && amountIn > 0n;
  const quotePath: Address[] | undefined = tokenOut ? [tokenIn.address, tokenOut.address] : undefined;

  const { data: amountsOutData } = useReadContract({
    address: ADDRESSES.router,
    abi: routerAbi,
    functionName: "getAmountsOut",
    args: quoteEnabled ? [amountIn, quotePath!] : undefined,
    query: { enabled: quoteEnabled },
  });
  const quotedOut: bigint | null = amountsOutData ? amountsOutData[amountsOutData.length - 1] : null;

  // Rate shown on the "quote" line: the router-quoted rate for the current
  // amount when one is typed, else a reserve-based unit-rate preview (both
  // use the same constant-product formula, so they agree once amountIn>0).
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

  const impactBps = useMemo(() => {
    if (!amountIn || amountIn <= 0n || !pair.reserves) return 0;
    if (pair.reserves.reserveA <= 0n || pair.reserves.reserveB <= 0n) return 0;
    try {
      return priceImpactBps(amountIn, pair.reserves.reserveA, pair.reserves.reserveB);
    } catch {
      return 0;
    }
  }, [amountIn, pair.reserves]);

  const highImpact = impactBps > HIGH_IMPACT_BPS;
  const warnImpact = impactBps > WARN_IMPACT_BPS;

  // A fresh amount/pair always needs a fresh high-impact confirmation.
  useEffect(() => {
    setImpactConfirmed(false);
  }, [tokenIn.address, tokenOut?.address, amountInText]);

  const { swap, status: swapStatus, error: swapError } = useSwap();

  const noPool = deployed && !!tokenOut && !pair.isLoading && pair.pairAddress === null;

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
    const nextIn = tokenOut;
    const nextOut = tokenIn;
    setTokenIn(nextIn);
    setTokenOut(nextOut);
    setAmountInText("");
  }

  function handleMax() {
    if (!balance) return;
    setAmountInText(toPlainAmount(balance.value, balance.decimals));
  }

  const busy = swapStatus === "approving" || swapStatus === "pending";
  const inputsDisabled = !deployed || busy;

  async function handleExecute() {
    if (highImpact && !impactConfirmed) {
      setImpactConfirmed(true);
      return;
    }
    if (!tokenOut || !amountIn || amountIn <= 0n || quotedOut == null) return;
    try {
      await swap({ tokenIn, tokenOut, amountIn, quotedOut });
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
    noPool ||
    (quotedOut == null && !(highImpact && !impactConfirmed));

  const executeLabel = highImpact && !impactConfirmed ? "confirm high impact" : "execute swap ↵";

  function statusMessage(): { message: string; tone: StatusTone } {
    if (!deployed) return { message: "contracts not deployed yet — see docs.hppy.ai", tone: "error" };
    if (noPool) return { message: "no pool for this pair — create one in pools", tone: "error" };
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
              onChange={setAmountInText}
              decimals={tokenIn.decimals}
              disabled={inputsDisabled}
              dataAgent="swap-amount-in"
            />
            <TokenSelect
              token={tokenIn}
              onSelect={setTokenIn}
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
              onSelect={setTokenOut}
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
            {amountIn && amountIn > 0n ? `${(impactBps / 100).toFixed(2)}%` : "—"}
          </span>
        </div>
        <div className="quote-row" data-agent="swap-route">
          <span className="quote-label">{dotLeader("route")}</span>
          <span className="quote-value">
            {tokenOut ? `direct (${tokenIn.symbol}/${tokenOut.symbol})` : "—"}
          </span>
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
