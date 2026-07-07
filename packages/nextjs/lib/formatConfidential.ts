import { formatUnits } from "viem";

/**
 * Format a decrypted confidential balance for display.
 *
 * `useConfidentialBalance` returns the cleartext as a raw base-unit `bigint`.
 * ERC-7984 cTokens carry their OWN decimals (often not 18), so the caller must
 * pass the confidential token's decimals — never hardcode 18 (03-RESEARCH
 * Pitfall 5, mirrors the WRP-02 "never hardcode 18" rule).
 *
 * Delegates to viem `formatUnits`, which trims trailing fractional zeros
 * (1000000n @ 6 -> "1", 1500000n @ 6 -> "1.5").
 */
export function formatConfidentialAmount(value: bigint, decimals: number): string {
  return formatUnits(value, decimals);
}
