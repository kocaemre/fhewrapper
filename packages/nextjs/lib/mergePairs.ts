import type { RegistryPair } from "../registry/types";

/**
 * Hybrid merge (02-RESEARCH Pattern 2 — REG-05).
 *
 * Overlay local overlay pairs under the onchain set, deduped by lowercased
 * ERC-7984 (confidential) address. Local entries are written first; onchain
 * entries are written last so they OVERWRITE (onchain wins on conflict).
 * Revoked pairs (isValid=false) are retained — filtering happens at the UI
 * layer, never here (REG-02).
 */
export function mergePairs(onchain: readonly RegistryPair[], local: readonly RegistryPair[]): RegistryPair[] {
  const byConfidential = new Map<string, RegistryPair>();
  for (const pair of local) {
    byConfidential.set(pair.confidential.address.toLowerCase(), pair);
  }
  for (const pair of onchain) {
    byConfidential.set(pair.confidential.address.toLowerCase(), pair);
  }
  return [...byConfidential.values()];
}
