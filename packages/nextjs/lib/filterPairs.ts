import type { RegistryPair } from "../registry/types";
import { normalizeSymbol } from "./tokenSymbol";

/** Valid/revoked filter mode for the registry toolbar (CONTEXT decision B). */
export type RegistryFilter = "all" | "valid" | "revoked";

/**
 * Pure client-side filter for the registry browser (REG-02, CONTEXT decision B).
 *
 * - `search` is a case-insensitive substring matched across BOTH sides'
 *   symbol (raw `*Mock` + normalized display form), name, and address. It is
 *   only used with `String.includes` — never interpolated into HTML, a query,
 *   or eval (T-02-06).
 * - `filter` narrows by validity: `all` keeps everything, `valid`/`revoked`
 *   keep pairs by `isValid`. Revoked pairs are retained in the source array so
 *   they stay filterable (Pitfall — never drop revoked upstream).
 * - The search and filter conditions combine with AND.
 *
 * Kept pure (no React, no I/O) so it is unit-testable and cheap to `useMemo`.
 */
export function filterPairs(pairs: RegistryPair[], search: string, filter: RegistryFilter): RegistryPair[] {
  const q = search.trim().toLowerCase();

  return pairs.filter(pair => {
    // Validity chip (AND).
    if (filter === "valid" && !pair.isValid) return false;
    if (filter === "revoked" && pair.isValid) return false;

    // Empty search keeps every pair the chip allowed.
    if (q === "") return true;

    const haystack = [
      pair.underlying.symbol,
      pair.confidential.symbol,
      normalizeSymbol(pair.underlying.symbol),
      normalizeSymbol(pair.confidential.symbol),
      pair.underlying.name,
      pair.confidential.name,
      pair.underlying.address,
      pair.confidential.address,
    ];

    return haystack.some(field => field.toLowerCase().includes(q));
  });
}
