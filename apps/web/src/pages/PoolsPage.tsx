// SPDX-License-Identifier: MIT
import type { MouseEvent } from "react";
import { Link, useNavigate, type NavigateFunction } from "react-router";
import { ADDRESSES, factoryAbi, isDeployed } from "@hppyswap/sdk";
import { useReadContract } from "wagmi";
import { StatusLine } from "../components/StatusLine";
import { usePools, type PoolRow } from "../hooks/usePools";
import { formatAmount } from "../lib/format";

const POOLS_LIMIT = 50;

function PoolTableRow({ pool, navigate }: { pool: PoolRow; navigate: NavigateFunction }) {
  const to = `/pools/${pool.pair}`;

  // The row itself navigates on click for a large, mouse-friendly hit
  // target, but bails out when the click originated from the pair <Link> so
  // that link isn't double-navigated (it already handles its own click).
  // Keyboard/screen-reader users reach the same destination via that real
  // link, tabbing to it and pressing Enter — no synthetic key handling
  // needed on the row.
  function handleRowClick(event: MouseEvent<HTMLTableRowElement>) {
    if ((event.target as HTMLElement).closest("a")) return;
    navigate(to, { state: { pool } });
  }

  return (
    <tr className="pool-row" data-agent="pool-row" data-pair={pool.pair} onClick={handleRowClick}>
      <td className="pool-pair-cell">
        <Link to={to} state={{ pool }} className="pool-pair-link">
          {pool.token0.symbol}/{pool.token1.symbol}
        </Link>
      </td>
      <td className="pool-reserves-cell">
        {formatAmount(pool.reserve0, pool.token0.decimals)} {pool.token0.symbol}
        {" · "}
        {formatAmount(pool.reserve1, pool.token1.decimals)} {pool.token1.symbol}
      </td>
    </tr>
  );
}

/**
 * Lists pools enumerated straight from the factory (usePools) as a
 * lowercase Terminal Soul table. Rows link to `/pools/:pairAddress`,
 * passing the already-fetched PoolRow via router state so Task 11's detail
 * page can paint instantly — it still re-fetches by address for direct
 * URL loads, so that state is an optimization, not a contract.
 */
export function PoolsPage() {
  const deployed = isDeployed();
  const navigate = useNavigate();
  const { pools, isLoading } = usePools(POOLS_LIMIT);

  // Reads the same `allPairsLength` query usePools' first stage does —
  // react-query dedupes identical queries, so this doesn't add a network
  // round trip — just to know the true pool count for the "showing first N
  // of M" note below.
  const { data: pairsLengthData } = useReadContract({
    address: ADDRESSES.factory,
    abi: factoryAbi,
    functionName: "allPairsLength",
    query: { enabled: deployed },
  });
  const totalCount = pairsLengthData != null ? Number(pairsLengthData) : null;

  if (!deployed) {
    return (
      <div className="pools-page">
        <div className="pools-header-line">
          <span className="pools-comment">// liquidity pools</span>
        </div>
        <StatusLine
          message="contracts not deployed yet — see docs.hppy.ai"
          tone="error"
          dataAgent="pools-status"
        />
      </div>
    );
  }

  return (
    <div className="pools-page">
      <div className="pools-header-line">
        <span className="pools-comment">// liquidity pools</span>
        <Link to="/pools/new" className="pools-create" data-agent="pools-create">
          + create pool
        </Link>
      </div>

      {isLoading ? (
        <StatusLine message="loading pools…" tone="info" dataAgent="pools-status" />
      ) : pools.length === 0 ? (
        <StatusLine
          message="no pools yet — be the first: add liquidity"
          tone="info"
          dataAgent="pools-status"
        />
      ) : (
        <>
          <table className="pools-table" data-agent="pools-table">
            <thead>
              <tr>
                <th scope="col">pair</th>
                <th scope="col">reserves</th>
              </tr>
            </thead>
            <tbody>
              {pools.map((pool) => (
                <PoolTableRow key={pool.pair} pool={pool} navigate={navigate} />
              ))}
            </tbody>
          </table>
          {totalCount != null && totalCount > POOLS_LIMIT ? (
            <p className="pools-note" data-agent="pools-limit-note">
              showing first {POOLS_LIMIT} of {totalCount} pools
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
