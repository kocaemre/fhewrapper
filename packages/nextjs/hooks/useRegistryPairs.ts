"use client";

import { useMemo } from "react";
import { getAddress, isAddress } from "viem";
import { sepolia } from "viem/chains";
import { useReadContract, useReadContracts } from "wagmi";
import { mergePairs } from "~~/lib/mergePairs";
import { type MulticallEntry, type OnchainPairRaw, regroupMeta } from "~~/lib/regroupMeta";
import { truncateAddress } from "~~/lib/tokenSymbol";
import { erc20MetadataAbi, registryAbi } from "~~/registry/abis";
import { REGISTRY_ADDRESS } from "~~/registry/addresses";
import { localPairs } from "~~/registry/pairs.config";
import type { LocalPair, RegistryPair } from "~~/registry/types";

const METADATA_CALLS = ["symbol", "name", "decimals"] as const;

/**
 * Build the 3 metadata reads for one token address, each pinned to Sepolia so
 * the multicall resolves off the public Sepolia RPC regardless of whether a
 * wallet is connected or which network it sits on (REG-01 SC1: fresh/incognito
 * wallet must populate the list). Matches the `chainId: sepolia.id` pin on the
 * enumerate read below.
 */
function metadataReads(address: `0x${string}`) {
  return METADATA_CALLS.map(functionName => ({
    address,
    abi: erc20MetadataAbi,
    functionName,
    chainId: sepolia.id,
  }));
}

/**
 * Convert a local overlay pair into an enriched RegistryPair, validating both
 * addresses (T-02-04: skip bad entries with a console warning, never crash).
 * Local pairs are NOT part of the onchain multicall this plan; they use
 * optional `overrides` and fall back to a truncated address for display.
 */
function localToRegistryPair(local: LocalPair): RegistryPair | null {
  if (!isAddress(local.tokenAddress) || !isAddress(local.confidentialTokenAddress)) {
    console.warn("[pairs.config] skipping local pair with invalid address:", local);
    return null;
  }
  const underlying = getAddress(local.tokenAddress);
  const confidential = getAddress(local.confidentialTokenAddress);
  const u = local.overrides?.underlying;
  const c = local.overrides?.confidential;
  return {
    underlying: {
      address: underlying,
      symbol: u?.symbol ?? truncateAddress(underlying),
      name: u?.name ?? truncateAddress(underlying),
      decimals: u?.decimals ?? 0,
      decimalsKnown: u?.decimalsKnown ?? false,
    },
    confidential: {
      address: confidential,
      symbol: c?.symbol ?? truncateAddress(confidential),
      name: c?.name ?? truncateAddress(confidential),
      decimals: c?.decimals ?? 0,
      decimalsKnown: c?.decimalsKnown ?? false,
    },
    isValid: local.isValid ?? true,
    source: "local",
  };
}

export type UseRegistryPairsResult = {
  pairs: RegistryPair[];
  validCount: number;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
};

/**
 * The registry data engine (REG-01/02/03/05).
 *
 * Two-phase onchain read (02-RESEARCH Pattern 1), NEVER hardcoded:
 *   1. one `useReadContract` enumerates the onchain pairs (1 RPC call);
 *   2. one `useReadContracts` multicall resolves symbol/name/decimals for BOTH
 *      sides of every pair (6 reads × N in a single Multicall3 aggregate — the
 *      keyless public RPC rate-limits, so per-token reads are forbidden,
 *      Pitfall 1);
 *   3. `regroupMeta` chunks the flat result back onto each pair, then
 *      `mergePairs` overlays `localPairs` (onchain wins on conflict).
 */
export function useRegistryPairs(): UseRegistryPairsResult {
  const {
    data: rawPairs,
    isLoading: pairsLoading,
    isError: pairsError,
    refetch: refetchPairs,
  } = useReadContract({
    address: REGISTRY_ADDRESS,
    abi: registryAbi,
    functionName: "getTokenConfidentialTokenPairs",
    chainId: sepolia.id,
  });

  const contracts = useMemo(
    () =>
      (rawPairs ?? []).flatMap(p => [...metadataReads(p.tokenAddress), ...metadataReads(p.confidentialTokenAddress)]),
    [rawPairs],
  );

  const {
    data: meta,
    isLoading: metaLoading,
    isError: metaError,
    refetch: refetchMeta,
  } = useReadContracts({
    contracts,
    allowFailure: true,
    query: { enabled: contracts.length > 0 },
  });

  const pairs = useMemo<RegistryPair[]>(() => {
    if (!rawPairs || !meta) return [];
    const onchainRaw: OnchainPairRaw[] = rawPairs.map(p => ({
      tokenAddress: p.tokenAddress,
      confidentialTokenAddress: p.confidentialTokenAddress,
      isValid: p.isValid,
    }));
    const onchainEnriched = regroupMeta(meta as unknown as readonly MulticallEntry[], onchainRaw);
    const localEnriched = localPairs.map(localToRegistryPair).filter((p): p is RegistryPair => p !== null);
    return mergePairs(onchainEnriched, localEnriched);
  }, [rawPairs, meta]);

  const validCount = useMemo(() => pairs.filter(p => p.isValid).length, [pairs]);

  return {
    pairs,
    validCount,
    isLoading: pairsLoading || (contracts.length > 0 && metaLoading),
    isError: pairsError || metaError,
    refetch: () => {
      refetchPairs();
      if (contracts.length > 0) refetchMeta();
    },
  };
}
