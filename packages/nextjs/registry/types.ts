import type { Address } from "viem";

/**
 * Registry domain types (Phase 2 — registry browse).
 *
 * The onchain `ConfidentialTokenWrappersRegistry` stores only addresses + a
 * validity flag; token metadata (symbol/name/decimals) is resolved separately
 * via a multicall of each token contract. A `RegistryPair` is the enriched,
 * merged shape the UI renders.
 */

/** Resolved metadata for one token (either side of a pair). */
export type TokenMeta = {
  address: Address;
  symbol: string;
  name: string;
  /** uint8 decimals decoded to a JS number; 0 when unresolved (see decimalsKnown). */
  decimals: number;
  /** false when the token's decimals() read failed — do not trust `decimals`. */
  decimalsKnown: boolean;
};

/** Where a merged pair originated (REG-05: onchain wins on conflict). */
export type PairSource = "onchain" | "local";

/** A fully enriched, merge-ready wrapper pair. */
export type RegistryPair = {
  underlying: TokenMeta;
  confidential: TokenMeta;
  isValid: boolean;
  source: PairSource;
};

/**
 * A local overlay pair declared in `registry/pairs.config.ts` (REG-05/REG-07).
 * Deduped against onchain entries by lowercased `confidentialTokenAddress`;
 * an onchain entry with the same confidential address always wins.
 */
export type LocalPair = {
  /** underlying ERC-20 */
  tokenAddress: `0x${string}`;
  /** ERC-7984 wrapper (dedup key) */
  confidentialTokenAddress: `0x${string}`;
  /** default true */
  isValid?: boolean;
  /** optional metadata overrides if a token lacks readable symbol/name/decimals */
  overrides?: {
    underlying?: Partial<TokenMeta>;
    confidential?: Partial<TokenMeta>;
  };
};
