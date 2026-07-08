import { parseUnits } from "viem";

/**
 * Unwrap amount validation (UNW-01).
 *
 * Turns an untrusted decimal string into a confidential-unit bigint in the
 * token's OWN decimals (never hardcode 18; Pitfall 4) and validates it against
 * the decrypted confidential balance. Parsing NEVER throws — invalid or
 * mid-typing input returns `valid: false` flags so the panel can disable the
 * CTA without a try/catch at the call site.
 */
export interface UnwrapAmount {
  /** Parsed amount in the token's base units (0n on unparseable input). */
  raw: bigint;
  /** True only when `raw > 0n` and it does not exceed the decrypted balance. */
  valid: boolean;
  /** True when a decrypted balance is known and `raw` exceeds it. */
  exceedsBalance: boolean;
  /** True when a non-empty positive-looking input parses to `0n`. */
  belowMinimum: boolean;
}

/**
 * Parse and validate a whole-token amount string for unwrapping.
 *
 * @param whole            user-entered decimal string (e.g. "1", "0.5")
 * @param decimals         the confidential token's decimals (decimals-driven)
 * @param decryptedBalance the decrypted confidential balance in base units, or
 *                         `undefined` when the user has not decrypted (the
 *                         unwrap-all path bypasses the amount entirely, so we do
 *                         NOT flag `exceedsBalance` in that case)
 */
export function parseUnwrapAmount(whole: string, decimals: number, decryptedBalance: bigint | undefined): UnwrapAmount {
  const trimmed = whole.trim();

  let raw: bigint;
  try {
    // parseUnits rejects negatives, stray chars, and lone "." by throwing.
    raw = trimmed === "" ? 0n : parseUnits(trimmed, decimals);
  } catch {
    return { raw: 0n, valid: false, exceedsBalance: false, belowMinimum: false };
  }

  const exceedsBalance = decryptedBalance !== undefined && raw > decryptedBalance;
  const belowMinimum = raw === 0n;
  const valid = raw > 0n && !exceedsBalance;

  return { raw, valid, exceedsBalance, belowMinimum };
}
