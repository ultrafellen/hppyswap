---
title: Revert dictionary
description: Every revert string HPPYSwap's contracts throw, what threw it, what it means, and how an agent should respond.
---

Every HPPYSwap transaction (or `eth_call`) that reverts does so with one of
these plain-string revert reasons — no custom errors, no numeric codes, an
unmodified Uniswap V2 fork. This table lists the strings agents are most
likely to hit through the router (Path A of
[Agents overview](/agents/overview/)); it isn't every `require` in the
vendored contracts (`contracts/src/`), but it is every one the router's
public swap/liquidity entry points and their two closest dependencies
(`UniswapV2Pair`, `UniswapV2Factory`) can surface directly. Strings are
copied verbatim from source — grep `contracts/src/` yourself if you need to
confirm one.

## `UniswapV2Router02`

Thrown by the router contract itself (`0x661aA4D2B0e3348125DEe6E75A28aD8E1e66f8a7`),
`contracts/src/periphery/UniswapV2Router02.sol`.

| Revert string | Meaning | Agent remediation |
|---|---|---|
| `UniswapV2Router: EXPIRED` | `block.timestamp` passed the `deadline` argument before the transaction was mined | Re-quote (`getAmountsOut`) and resend with a fresh deadline — never resubmit the same signed transaction, the price may have moved |
| `UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT` | The route's actual output fell below `amountOutMin` — the trade moved against the caller beyond the slippage tolerance between quote and execution | Re-quote and retry with the same or a wider (but still user-authorized) slippage bps; do not silently widen slippage beyond what the user allowed |
| `UniswapV2Router: INSUFFICIENT_A_AMOUNT` | In `addLiquidity`/`removeLiquidity`, the pool's current ratio produced (or required) less of token A than `amountAMin` allowed | Re-derive the paired amount with `quote(amountA, reserveA, reserveB)` against fresh reserves and retry, or loosen `amountAMin` if the user authorized it |
| `UniswapV2Router: INSUFFICIENT_B_AMOUNT` | Same as above, for token B | Same remediation, for token B |
| `UniswapV2Router: EXCESSIVE_INPUT_AMOUNT` | In an exact-output swap (`swapTokensForExactTokens`, `swapETHForExactTokens`, …), the required input exceeded `amountInMax` | Re-quote with `getAmountsIn` and retry with a higher `amountInMax` only if the user authorized that much input |

## `UniswapV2Factory`

Thrown by the factory contract, `contracts/src/core/UniswapV2Factory.sol`
(`createPair`). Rare through the router — `_addLiquidity` only calls
`createPair` when no pool exists yet — but possible on a direct call.

| Revert string | Meaning | Agent remediation |
|---|---|---|
| `UniswapV2: IDENTICAL_ADDRESSES` | `createPair(tokenA, tokenB)` was called with `tokenA == tokenB` | Fix the caller's token selection — this is a client-side bug, not a race condition |
| `UniswapV2: ZERO_ADDRESS` | One of the two token addresses (after sorting) is `address(0)` | Fix the caller's token selection — never pass the zero address as a token |
| `UniswapV2: PAIR_EXISTS` | A pool for this token pair was already created (possibly by someone else, between your `getPair` check and your `createPair` call) | Not an error to retry past — call `getPair(tokenA, tokenB)` to fetch the existing pair address and use it directly (or via `addLiquidity`, which does this check for you) |

## `UniswapV2Pair`

Thrown by an individual pool contract, `contracts/src/core/UniswapV2Pair.sol`.
The router's `swap`/`mint`/`burn` calls proxy into these — a pair-level
revert surfaces through a router transaction the same way a router-level one
does.

| Revert string | Meaning | Agent remediation |
|---|---|---|
| `UniswapV2: INSUFFICIENT_LIQUIDITY` | The pool's reserves are zero, or the requested output would drain a reserve entirely | Check `getReserves()` before quoting; a pool with (near-)zero reserves cannot fill any meaningful trade — this is the small-liquidity risk called out in the [manifest](/agents/hppyswap.json)'s disclaimer |
| `UniswapV2: INSUFFICIENT_INPUT_AMOUNT` | The pair's `swap()` was called (directly, bypassing the router) without actually transferring any input token in first | Only call the pair's `swap()` through the router's higher-level functions unless you're implementing the transfer-then-call pattern yourself |
| `UniswapV2: INSUFFICIENT_OUTPUT_AMOUNT` | The pair's `swap()` was called with both `amount0Out` and `amount1Out` as zero | Same as above — this is a direct-pair-call bug, not something the router's own functions can trigger |
| `UniswapV2: INSUFFICIENT_LIQUIDITY_MINTED` | `addLiquidity`'s deposit was too small relative to existing supply to mint any LP tokens (rounds to zero) | Increase the deposit size, or check `totalSupply()`/reserves first if depositing a very small amount into a large pool |
| `UniswapV2: INSUFFICIENT_LIQUIDITY_BURNED` | `removeLiquidity`'s LP amount was too small relative to `totalSupply()` to redeem any underlying tokens (rounds to zero) | Increase the LP amount being burned, e.g. via the UI's percent-of-balance presets rather than a small fixed amount |
| `UniswapV2: K` | The constant-product invariant (`x * y = k`, fee-adjusted) didn't hold after the swap — the router computed an input/output pair that doesn't balance, almost always a symptom of a stale quote or a bug in a caller that bypasses the router's own math | Re-quote via `getAmountsOut`/`getAmountsIn` immediately before building the transaction; don't reuse a quote that's more than a few blocks old |
| `UniswapV2: INVALID_TO` | The swap recipient equals one of the pool's tokens (checked in `Pair.swap()`) — transfers to token addresses are forbidden | Use a different `to` address as the swap recipient; never specify a token address as the output destination |
| `UniswapV2: TRANSFER_FAILED` | A pool token's `transfer()` returned false or reverted during swap/burn (checked in `Pair._safeTransfer()`) — the token may be non-standard or paused | Investigate the token contract; check if it's paused, frozen, or uses non-standard transfer semantics before retrying |
| `UniswapV2: EXPIRED` | The permit deadline passed (checked in `UniswapV2ERC20.permit()`, inherited by Pair) — reachable via the router's `removeLiquidity*WithPermit` functions | Generate a fresh permit signature with a later deadline; **note: this is DISTINCT from `UniswapV2Router: EXPIRED`** — exact-match lookups must not confuse them |

## `TransferHelper`

Thrown by `contracts/src/periphery/libraries/TransferHelper.sol`, used
internally by the router whenever it moves ERC-20s on the caller's behalf
(pulling `amountIn`/deposit amounts from `msg.sender`, or paying out a
`transfer`). Despite the generic-sounding name, the exact string differs per
helper function — reported here as it actually appears in the vendored
source, not a normalized code.

| Revert string | Thrown by | Meaning | Agent remediation |
|---|---|---|---|
| `TransferHelper::transferFrom: transferFrom failed` | `TransferHelper.safeTransferFrom`, called by the router (e.g. `addLiquidity`, `swapExactTokensForTokens`) to pull the input token from the caller | Almost always insufficient `allowance(caller, router)` or insufficient token balance — the two things a plain ERC-20 `transferFrom` checks | Verify `allowance(owner, router) >= amountIn` and `balanceOf(owner) >= amountIn` before sending; send an `approve` first if allowance is short (see [On-chain integration](/agents/onchain/#3-approve-if-needed)) |
| `TransferHelper::safeTransfer: transfer failed` | `TransferHelper.safeTransfer`, called when the router pays a token out to a recipient | The router's own balance of that token was insufficient — normally unreachable through the router's own accounting; suggests something upstream already went wrong | Treat as a bug signal rather than something to retry — re-check the transaction trace before resending |
| `TransferHelper::safeApprove: approve failed` | `TransferHelper.safeApprove` | The router failed to approve a token it holds (used internally in some flows, not by a normal swap/liquidity call from an agent) | Not expected in ordinary swap/liquidity usage; if seen, treat as a bug signal |
| `TransferHelper::safeTransferETH: ETH transfer failed` | `TransferHelper.safeTransferETH`, called for ETH refunds (e.g. overpaying `addLiquidityETH`) or ETH payouts | The recipient address rejected the ETH transfer (e.g. a contract with no `receive`/`payable fallback`, or one that reverts) | If `to` is a contract address, confirm it can actually receive ETH before using it as the swap/liquidity recipient |

## Not covered here

Reentrancy guards (`UniswapV2: LOCKED`), factory/pair access control
(`UniswapV2: FORBIDDEN`), `permit` signature checks (`UniswapV2:
INVALID_SIGNATURE`), and `UniswapV2Router: INVALID_PATH` (an ETH-leg swap
function called with a `path` whose first/last element isn't `WETH`) exist
in the vendored contracts but aren't itemized above — none of them should
occur through normal use of the flows in
[On-chain integration](/agents/onchain/). See `contracts/src/` in the
repository for the full set if you're calling something more unusual. The
three most recent additions (`UniswapV2: INVALID_TO`, `TRANSFER_FAILED`,
`EXPIRED`) cover all critical pair-level revert paths reachable through the
router.
