/**
 * Faucet pure logic (FCT-02) — no chain, no wagmi, no SDK import.
 *
 * The faucet is a plain public `mint(address,uint256)` on the cTokenMock
 * underlying ERC-20 (04-RESEARCH Pattern 1: selector 0x40c10f19, no access
 * control, 1,000,000-per-call cap; tGBP is the one restricted exception). These
 * two functions own the correctness-critical edges:
 *
 *   - `clampFaucetAmount` (T-04-01): bound the user/UI amount to the verified
 *     per-call cap and reject non-positive / non-numeric input so the caller
 *     disables the claim rather than sending a doomed tx.
 *   - `toFaucetError` (T-04-03): map every real FCT-02 failure (low Sepolia ETH
 *     for gas, tGBP restricted mint, over-cap revert, wallet rejection) to human
 *     copy — a raw revert string must never reach the UI.
 *
 * There is NO onchain cooldown; a "cooldown/already-claimed" state would be
 * fiction (04-RESEARCH Anti-Patterns), so it is deliberately absent here.
 */
import { toAppError } from "./appError";

/** Verified per-call mint cap (whole tokens) — 04-RESEARCH Pattern 1. */
export const FAUCET_CAP = 1_000_000;

/**
 * Bound a claim amount to `[0, FAUCET_CAP]` in whole tokens.
 *
 * Accepts a number or a string; anything non-finite, ≤ 0, or non-numeric
 * collapses to `0` (the caller treats 0 as "disable the claim button").
 * Fractional whole-token amounts are allowed below the cap. Never throws.
 */
export function clampFaucetAmount(whole: number | string): number {
  const n = typeof whole === "string" ? Number(whole.trim()) : whole;
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, FAUCET_CAP);
}

/**
 * Classify a faucet mint failure into readable copy (never a raw revert).
 *
 * Delegates to the unified `toAppError` classifier (CONTEXT Decision A) under
 * the `"faucet"` flow, forwarding the tGBP `restricted` flag. The copy and the
 * priority order (restricted > wallet-rejection > insufficient-gas > over-cap >
 * generic fallback) are identical to the pre-consolidation map — the faucet's
 * plain-ERC-20-mint path stays purely text-based inside `toAppError`.
 */
export function toFaucetError(e: unknown, opts?: { restricted?: boolean }): string {
  return toAppError(e, { flow: "faucet", restricted: opts?.restricted }).body;
}
