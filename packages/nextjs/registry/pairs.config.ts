import type { LocalPair } from "./types";

/**
 * Local overlay pairs (REG-05 / REG-07 — the "add a pair" mechanism).
 *
 * Declare custom or dev-only wrapper pairs here to have them merged into the
 * onchain registry list. Entries are deduped by `confidentialTokenAddress`
 * (lowercased); an ONCHAIN entry with the same confidential address ALWAYS
 * wins on conflict — a local entry only surfaces a pair the registry does not
 * already list.
 *
 * Add a pair by pushing an object with both addresses. Addresses are validated
 * with viem `isAddress`/`getAddress` where they enter the read pipeline
 * (invalid entries are skipped with a console warning — T-02-04), so a typo
 * cannot crash the grid.
 *
 * Example:
 *   export const localPairs: LocalPair[] = [
 *     {
 *       tokenAddress: "0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF",             // underlying ERC-20
 *       confidentialTokenAddress: "0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639", // ERC-7984 wrapper (dedup key)
 *       // isValid?: boolean (default true)
 *       // overrides?: { underlying?: {...}, confidential?: {...} }  // if a token lacks readable metadata
 *     },
 *   ];
 */
export const localPairs: LocalPair[] = [];
