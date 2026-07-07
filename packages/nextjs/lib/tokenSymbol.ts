/**
 * Symbol/address display helpers (02-RESEARCH Pattern 3 — Pitfall 2 fix).
 *
 * Onchain symbols are `*Mock` (e.g. `USDCMock`, `cUSDCMock`), NOT the clean
 * design/icon keys. Any icon lookup or symbol-based matching MUST normalize:
 * strip a trailing `Mock` suffix (case-insensitive), strip a single leading
 * confidential `c`, then lowercase — so both sides of a pair map to one key.
 */

/**
 * Reduce a raw onchain symbol to its clean lowercase icon key.
 * "USDCMock" -> "usdc"; "cUSDCMock" -> "usdc"; "ctGBPMock" -> "tgbp".
 */
export const iconKey = (sym: string): string => sym.replace(/Mock$/i, "").replace(/^c/, "").toLowerCase();

/**
 * Map a confidential symbol to its self-hosted icon path.
 * "cUSDCMock" -> "/icons/cusdc.png". A missing file should fall back to a
 * monogram tile at the render layer, never a broken <img> (02-02).
 */
export const iconFor = (confidentialSymbol: string): string => `/icons/c${iconKey(confidentialSymbol)}.png`;

/**
 * Display normalization: strip only the trailing `Mock` suffix, preserving the
 * confidential `c` prefix and original casing. "USDCMock" -> "USDC";
 * "cUSDCMock" -> "cUSDC".
 */
export const normalizeSymbol = (sym: string): string => sym.replace(/Mock$/i, "");

/** Truncate a 0x address to first-6 + ellipsis + last-4 (e.g. "0x9b5C…DFfF"). */
export const truncateAddress = (address: string): string => `${address.slice(0, 6)}…${address.slice(-4)}`;
