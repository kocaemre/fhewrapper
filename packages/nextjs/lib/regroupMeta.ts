import type { RegistryPair, TokenMeta } from "../registry/types";
import { truncateAddress } from "./tokenSymbol";
import type { Address } from "viem";

/**
 * One entry of a wagmi `useReadContracts` result with `allowFailure: true`.
 * Success carries `result`; failure carries `error` and no usable result.
 */
export type MulticallEntry = { status: "success"; result: unknown } | { status: "failure"; error: unknown };

/** The raw pair struct returned by the registry read. */
export type OnchainPairRaw = {
  tokenAddress: Address;
  confidentialTokenAddress: Address;
  isValid: boolean;
};

const CALLS_PER_PAIR = 6;

/** Resolve a string metadata call, falling back to a truncated address. */
function pickString(entry: MulticallEntry | undefined, address: Address): string {
  if (entry?.status === "success" && typeof entry.result === "string" && entry.result.length > 0) {
    return entry.result;
  }
  return truncateAddress(address);
}

/** Resolve a uint8 decimals call; flags (never throws) when unresolved. */
function pickDecimals(entry: MulticallEntry | undefined): { value: number; known: boolean } {
  if (entry?.status === "success" && typeof entry.result === "number") {
    return { value: entry.result, known: true };
  }
  return { value: 0, known: false };
}

function metaFor(
  address: Address,
  symbol: MulticallEntry | undefined,
  name: MulticallEntry | undefined,
  decimals: MulticallEntry | undefined,
): TokenMeta {
  const dec = pickDecimals(decimals);
  return {
    address,
    symbol: pickString(symbol, address),
    name: pickString(name, address),
    decimals: dec.value,
    decimalsKnown: dec.known,
  };
}

/**
 * Regroup a flat multicall result (length 6×N, entries {status,result}) back
 * onto each pair (02-RESEARCH Pattern 1 — REG-03). Layout per pair, in order:
 * [underlying.symbol, underlying.name, underlying.decimals,
 *  confidential.symbol, confidential.name, confidential.decimals].
 * Per-call failures fall back (missing symbol/name -> truncated address;
 * missing decimals -> flagged) rather than throwing the whole batch (Pitfall 5).
 */
export function regroupMeta(results: readonly MulticallEntry[], pairs: readonly OnchainPairRaw[]): RegistryPair[] {
  return pairs.map((pair, index) => {
    const base = index * CALLS_PER_PAIR;
    return {
      underlying: metaFor(pair.tokenAddress, results[base], results[base + 1], results[base + 2]),
      confidential: metaFor(pair.confidentialTokenAddress, results[base + 3], results[base + 4], results[base + 5]),
      isValid: pair.isValid,
      source: "onchain",
    };
  });
}
