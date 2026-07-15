// SPDX-License-Identifier: MIT
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { useConnection, useReadContract, useReadContracts } from "wagmi";
import { isAddress, type Address } from "viem";
import { DEFAULT_TOKENS, erc20Abi, isDeployed, pairAbi, type TokenInfo } from "@hppyswap/sdk";
import { AmountInput } from "../components/AmountInput";
import { TokenSelect } from "../components/TokenSelect";
import { StatusLine, type StatusTone } from "../components/StatusLine";
import { usePair } from "../hooks/usePair";
import { useLiquidity } from "../hooks/useLiquidity";
import type { PoolRow, TokenMeta } from "../hooks/usePools";
import { buildPoolRows } from "../lib/pools";
import { formatAmount, parseAmount, toPlainAmount } from "../lib/format";
import { computeSharePercent, deriveSecondAmount, lpAmountForPercent } from "../lib/liquidity";

const PERCENT_PRESETS = [25, 50, 75, 100] as const;
// UniswapV2Pair LP tokens are plain 18-decimal ERC20s regardless of the
// underlying pair's token decimals.
const LP_DECIMALS = 18;

/**
 * Pool detail page for both routes App.tsx wires to it:
 *  - `/pools/new` (no `:pairAddress` param) — pick two tokens, then add
 *    liquidity; free-input if no pool exists yet for that pair, or hands
 *    off to the real address route the moment one is found.
 *  - `/pools/:pairAddress` — fetches the pair fresh by address (a
 *    `{pool: PoolRow}` router-state value from the pools list, if present,
 *    only paints an instant header preview; it's never used for on-chain
 *    math, which always waits on the live read).
 */
export function PoolDetailPage() {
  const deployed = isDeployed();
  const { pairAddress: pairAddressParam } = useParams<{ pairAddress?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { address: owner, isConnected } = useConnection();

  const isNewRoute = pairAddressParam === undefined;
  const routeAddress: Address | null =
    pairAddressParam !== undefined && isAddress(pairAddressParam) ? (pairAddressParam as Address) : null;
  const statePool = (location.state as { pool?: PoolRow } | null)?.pool ?? null;

  // ---- new-pool mode: two free token pickers ----
  const [tokenA, setTokenA] = useState<TokenInfo | null>(() => (isNewRoute ? DEFAULT_TOKENS[0] : null));
  const [tokenB, setTokenB] = useState<TokenInfo | null>(null);

  const newPair = usePair(isNewRoute ? tokenA?.address : undefined, isNewRoute ? tokenB?.address : undefined);

  // The moment the chosen pair turns out to already exist, this is really
  // "existing pool" — hand off to the real address route rather than
  // duplicating the add-liquidity form logic here.
  useEffect(() => {
    if (isNewRoute && newPair.pairAddress) {
      navigate(`/pools/${newPair.pairAddress}`, { replace: true });
    }
  }, [isNewRoute, newPair.pairAddress, navigate]);

  // ---- existing-pool mode: fetch everything fresh by address ----
  const pairReadsEnabled = deployed && !isNewRoute && routeAddress != null;
  const {
    data: pairCoreData,
    isLoading: isCoreLoading,
    refetch: refetchPairCore,
  } = useReadContracts({
    contracts: [
      { address: routeAddress ?? undefined, abi: pairAbi, functionName: "token0" },
      { address: routeAddress ?? undefined, abi: pairAbi, functionName: "token1" },
      { address: routeAddress ?? undefined, abi: pairAbi, functionName: "getReserves" },
      { address: routeAddress ?? undefined, abi: pairAbi, functionName: "totalSupply" },
    ],
    query: { enabled: pairReadsEnabled },
  });

  const token0Address = pairCoreData?.[0]?.status === "success" ? pairCoreData[0].result : null;
  const token1Address = pairCoreData?.[1]?.status === "success" ? pairCoreData[1].result : null;
  const coreReserves = pairCoreData?.[2]?.status === "success" ? pairCoreData[2].result : null;
  const totalSupply = pairCoreData?.[3]?.status === "success" ? pairCoreData[3].result : null;
  const reserve0 = coreReserves ? coreReserves[0] : null;
  const reserve1 = coreReserves ? coreReserves[1] : null;

  const coreReadFailed =
    pairReadsEnabled && !isCoreLoading && (pairCoreData?.some((r) => r.status !== "success") ?? false);

  const tokenAddrs = useMemo(
    () => (token0Address && token1Address ? [token0Address, token1Address] : []),
    [token0Address, token1Address],
  );
  const tokenMetaEnabled = pairReadsEnabled && tokenAddrs.length === 2;
  const { data: symbolData, isLoading: isSymbolLoading } = useReadContracts({
    contracts: tokenAddrs.map((a) => ({ address: a, abi: erc20Abi, functionName: "symbol" }) as const),
    query: { enabled: tokenMetaEnabled },
  });
  const { data: decimalsData, isLoading: isDecimalsLoading } = useReadContracts({
    contracts: tokenAddrs.map((a) => ({ address: a, abi: erc20Abi, functionName: "decimals" }) as const),
    query: { enabled: tokenMetaEnabled },
  });

  // The live-fetched pool — the only source of truth for on-chain math
  // (amountMin, ratio-derivation, remove shares). Reuses usePools' join
  // helper so a single pair's shape stays identical to the list's.
  const fetchedPool = useMemo<PoolRow | null>(() => {
    if (!routeAddress || !token0Address || !token1Address || reserve0 == null || reserve1 == null) return null;
    if (!symbolData || !decimalsData) return null;
    const tokenMeta = new Map<string, TokenMeta>();
    for (let i = 0; i < tokenAddrs.length; i++) {
      const s = symbolData[i];
      const d = decimalsData[i];
      if (s?.status !== "success" || d?.status !== "success") continue;
      tokenMeta.set(tokenAddrs[i].toLowerCase(), { address: tokenAddrs[i], symbol: s.result, decimals: d.result });
    }
    const rows = buildPoolRows(
      [{ pair: routeAddress, token0: token0Address, token1: token1Address, reserve0, reserve1 }],
      tokenMeta,
    );
    return rows[0] ?? null;
  }, [routeAddress, token0Address, token1Address, reserve0, reserve1, tokenAddrs, symbolData, decimalsData]);

  // Router-state pool paints the header instantly on a pools-list click
  // while the live read above resolves — an optimization only, never used
  // for the interactive forms below.
  const displayPool =
    fetchedPool ??
    (statePool && routeAddress && statePool.pair.toLowerCase() === routeAddress.toLowerCase() ? statePool : null);

  const isLoadingPool =
    pairReadsEnabled &&
    !coreReadFailed &&
    (isCoreLoading || (tokenMetaEnabled && (isSymbolLoading || isDecimalsLoading)));

  const notFound = !isNewRoute && deployed && (routeAddress == null || coreReadFailed);

  // ---- LP balance for the header + remove form ----
  const { data: lpBalanceData, refetch: refetchLpBalance } = useReadContract({
    address: routeAddress ?? undefined,
    abi: pairAbi,
    functionName: "balanceOf",
    args: owner ? [owner] : undefined,
    query: { enabled: pairReadsEnabled && !!owner },
  });
  const lpBalance = lpBalanceData ?? 0n;
  const sharePercent = totalSupply != null ? computeSharePercent(lpBalance, totalSupply) : 0;

  const { addLiquidity, removeLiquidity, status, error, reset } = useLiquidity();
  const busy = status === "approving" || status === "pending";

  // ---- add-liquidity form ----
  const [amountAText, setAmountAText] = useState("");
  const [amountBText, setAmountBText] = useState("");

  const addTokenA = isNewRoute ? tokenA : fetchedPool?.token0 ?? null;
  const addTokenB = isNewRoute ? tokenB : fetchedPool?.token1 ?? null;
  const existingReserves =
    fetchedPool && fetchedPool.reserve0 > 0n && fetchedPool.reserve1 > 0n
      ? { reserveA: fetchedPool.reserve0, reserveB: fetchedPool.reserve1 }
      : null;
  const isNewPool = isNewRoute || existingReserves == null;

  const showAddForm = isNewRoute
    ? !!tokenA && !!tokenB && !newPair.isLoading && newPair.pairAddress === null
    : !!fetchedPool;

  function handleAmountAChange(text: string) {
    reset();
    setAmountAText(text);
    if (!isNewPool && addTokenA && addTokenB && existingReserves) {
      const amt = parseAmount(text, addTokenA.decimals);
      const derived = deriveSecondAmount(amt, existingReserves.reserveA, existingReserves.reserveB);
      setAmountBText(derived != null ? toPlainAmount(derived, addTokenB.decimals) : "");
    }
  }

  function handleAmountBChange(text: string) {
    reset();
    setAmountBText(text);
    if (!isNewPool && addTokenA && addTokenB && existingReserves) {
      const amt = parseAmount(text, addTokenB.decimals);
      const derived = deriveSecondAmount(amt, existingReserves.reserveB, existingReserves.reserveA);
      setAmountAText(derived != null ? toPlainAmount(derived, addTokenA.decimals) : "");
    }
  }

  function handleSelectTokenA(t: TokenInfo) {
    reset();
    setTokenA(t);
    setAmountAText("");
    setAmountBText("");
  }

  function handleSelectTokenB(t: TokenInfo) {
    reset();
    setTokenB(t);
    setAmountAText("");
    setAmountBText("");
  }

  const amountA = addTokenA ? parseAmount(amountAText, addTokenA.decimals) : null;
  const amountB = addTokenB ? parseAmount(amountBText, addTokenB.decimals) : null;

  async function handleAdd() {
    if (!addTokenA || !addTokenB || amountA == null || amountA <= 0n || amountB == null || amountB <= 0n) return;
    try {
      await addLiquidity({
        tokenA: addTokenA.address,
        tokenB: addTokenB.address,
        amountADesired: amountA,
        amountBDesired: amountB,
        reserves: existingReserves,
      });
      setAmountAText("");
      setAmountBText("");
      // A brand-new pool's address isn't known client-side until this tx
      // lands; send the user to the list rather than guess at a URL.
      if (isNewRoute) {
        navigate("/pools");
      } else {
        // Reserves/totalSupply and the caller's LP balance just changed
        // on-chain — refetch so the header, remove-form math, and the
        // next percent-preset click aren't computed off stale data.
        await Promise.all([refetchPairCore(), refetchLpBalance()]);
      }
    } catch {
      // useLiquidity already captured status/error for the liq-status region.
    }
  }

  // ---- remove-liquidity form ----
  const [removePercent, setRemovePercent] = useState<number | null>(null);
  const removeAmount = removePercent != null ? lpAmountForPercent(lpBalance, removePercent) : 0n;

  function handlePercentClick(p: number) {
    reset();
    setRemovePercent(p);
  }

  async function handleRemove() {
    if (!routeAddress || !fetchedPool || totalSupply == null || removeAmount <= 0n) return;
    try {
      await removeLiquidity({
        tokenA: fetchedPool.token0.address,
        tokenB: fetchedPool.token1.address,
        pairAddress: routeAddress,
        liquidity: removeAmount,
        totalSupply,
        reserveA: fetchedPool.reserve0,
        reserveB: fetchedPool.reserve1,
      });
      setRemovePercent(null);
      // Same staleness concern as handleAdd — a stale lpBalance/totalSupply
      // would make a later "100%" click compute against burned liquidity
      // that no longer exists.
      await Promise.all([refetchPairCore(), refetchLpBalance()]);
    } catch {
      // useLiquidity already captured status/error for the liq-status region.
    }
  }

  function statusMessage(): { message: string; tone: StatusTone } {
    if (isLoadingPool) return { message: "loading pool…", tone: "info" };
    if (status === "approving") return { message: "approving token spend…", tone: "info" };
    if (status === "pending") return { message: "transaction pending — waiting for confirmation…", tone: "info" };
    if (status === "success") return { message: "liquidity updated", tone: "success" };
    if (status === "error" && error) return { message: error, tone: "error" };
    const formShowing = isNewRoute ? !!(tokenA && tokenB) : !!fetchedPool;
    if (!isConnected && formShowing) return { message: "connect a wallet to manage liquidity", tone: "info" };
    return { message: "", tone: "info" };
  }

  if (!deployed) {
    return (
      <div className="pool-detail-page">
        <div className="swap-header-line">
          <span className="swap-comment">// pool detail</span>
        </div>
        <StatusLine message="contracts not deployed yet — see docs.hppy.ai" tone="error" dataAgent="liq-status" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="pool-detail-page">
        <div className="swap-header-line">
          <span className="swap-comment">// pool detail</span>
        </div>
        <StatusLine message="pool not found" tone="error" dataAgent="liq-status" />
        <p className="pool-not-found-link">
          <Link to="/pools">back to pools</Link>
        </p>
      </div>
    );
  }

  const { message, tone } = statusMessage();

  return (
    <div className="pool-detail-page">
      <div className="swap-header-line">
        <span className="swap-comment">
          {isNewRoute
            ? "// create a new pool"
            : displayPool
              ? `// ${displayPool.token0.symbol}/${displayPool.token1.symbol} pool`
              : "// pool detail"}
        </span>
        <Link to="/pools" className="pools-create">
          ← back to pools
        </Link>
      </div>

      {!isNewRoute && displayPool && (
        <div className="pool-header">
          <p className="pool-reserves-line" data-agent="liq-reserves">
            reserves: {formatAmount(displayPool.reserve0, displayPool.token0.decimals)} {displayPool.token0.symbol}
            {" · "}
            {formatAmount(displayPool.reserve1, displayPool.token1.decimals)} {displayPool.token1.symbol}
          </p>
          <p className="lp-balance-line" data-agent="liq-lp-balance">
            my LP {formatAmount(lpBalance, LP_DECIMALS)} ({sharePercent.toFixed(2)}% share)
          </p>
        </div>
      )}

      {isNewRoute && (!tokenA || !tokenB) && (
        <div className="swap-card">
          <div className="swap-side">
            <div className="swap-side-label">&gt; token a</div>
            <TokenSelect
              token={tokenA}
              onSelect={handleSelectTokenA}
              dataAgent="liq-token-a"
              excludeAddress={tokenB?.address}
            />
          </div>
          <div className="swap-side">
            <div className="swap-side-label">&gt; token b</div>
            <TokenSelect
              token={tokenB}
              onSelect={handleSelectTokenB}
              dataAgent="liq-token-b"
              excludeAddress={tokenA?.address}
            />
          </div>
        </div>
      )}

      {showAddForm && addTokenA && addTokenB && (
        <>
          <div className="swap-card">
            <div className="swap-side">
              <div className="swap-side-label">&gt; deposit</div>
              <div className="swap-side-row">
                <AmountInput
                  value={amountAText}
                  onChange={handleAmountAChange}
                  decimals={addTokenA.decimals}
                  disabled={busy}
                  dataAgent="liq-amount-a"
                />
                <span className="token-select-trigger">{addTokenA.symbol}</span>
              </div>
              <div className="swap-side-row">
                <AmountInput
                  value={amountBText}
                  onChange={handleAmountBChange}
                  decimals={addTokenB.decimals}
                  disabled={busy}
                  dataAgent="liq-amount-b"
                />
                <span className="token-select-trigger">{addTokenB.symbol}</span>
              </div>
            </div>
          </div>

          {isNewPool && (
            <p className="initial-price-note" data-agent="liq-initial-price-note">
              you are setting the initial price for this pool.
            </p>
          )}

          <button
            type="button"
            className="execute-button"
            data-agent="liq-add-execute"
            disabled={busy || !isConnected || amountA == null || amountA <= 0n || amountB == null || amountB <= 0n}
            onClick={handleAdd}
          >
            add liquidity ↵
          </button>
        </>
      )}

      {!isNewRoute && fetchedPool && (
        <div className="swap-card">
          <div className="swap-side">
            <div className="swap-side-label">&gt; withdraw</div>
            <div className="percent-button-group" data-agent="liq-remove-percent-group">
              {PERCENT_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={removePercent === p ? "percent-button percent-button-active" : "percent-button"}
                  data-agent="liq-remove-percent"
                  data-percent={p}
                  disabled={busy || !isConnected || lpBalance <= 0n}
                  onClick={() => handlePercentClick(p)}
                >
                  {p}%
                </button>
              ))}
            </div>
            <p className="remove-amount-line" data-agent="liq-remove-amount">
              {removeAmount > 0n ? `${formatAmount(removeAmount, LP_DECIMALS)} LP` : "select a percent"}
            </p>
          </div>

          <button
            type="button"
            className="execute-button"
            data-agent="liq-remove-execute"
            disabled={busy || !isConnected || removeAmount <= 0n}
            onClick={handleRemove}
          >
            remove liquidity ↵
          </button>
        </div>
      )}

      <StatusLine message={message} tone={tone} dataAgent="liq-status" />
    </div>
  );
}
