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

/** Extract a lowercased "name + message" haystack from any thrown value. */
function errorText(e: unknown): string {
  if (e == null) return "";
  if (typeof e === "string") return e.toLowerCase();
  if (typeof e === "object") {
    const anyE = e as { name?: unknown; message?: unknown; shortMessage?: unknown; details?: unknown };
    return [anyE.name, anyE.shortMessage, anyE.message, anyE.details]
      .filter(v => typeof v === "string")
      .join(" ")
      .toLowerCase();
  }
  return "";
}

/**
 * Classify a faucet mint failure into readable copy (never a raw revert).
 *
 * Priority order matters:
 *   1. `restricted` (tGBP) — surfaced even before inspecting the error, because
 *      a restricted mint reverts and we want the actionable copy, not the cap
 *      message.
 *   2. wallet rejection — checked before the generic revert branch so a declined
 *      prompt reads as intent, not failure.
 *   3. insufficient funds / gas — the most common FCT-02 case (near-zero wallet).
 *   4. revert / over-cap "exceeds" — the cap or restricted-mint fallback.
 *   5. anything else — a safe generic fallback.
 */
export function toFaucetError(e: unknown, opts?: { restricted?: boolean }): string {
  if (opts?.restricted) {
    return "This token's faucet is restricted — claim it from the official testnet faucet.";
  }

  const text = errorText(e);

  if (text.includes("user rejected") || text.includes("userrejected") || text.includes("denied")) {
    return "You declined the wallet prompt.";
  }

  if (text.includes("insufficient funds") || text.includes("insufficientfunds") || text.includes("intrinsic gas")) {
    return "You need Sepolia ETH for gas — top up from a Sepolia ETH faucet first.";
  }

  if (text.includes("revert") || text.includes("exceed")) {
    return "Claim failed — amount may exceed the 1,000,000-per-call limit, or this token's mint is restricted.";
  }

  return "Could not claim test tokens — please try again.";
}
