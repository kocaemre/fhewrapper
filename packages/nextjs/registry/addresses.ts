import type { Address } from "viem";
import { sepolia } from "viem/chains";

/**
 * ConfidentialTokenWrappersRegistry address per chainId (V14 config control:
 * hardcoded constant, never user-supplied). Sepolia address verified live
 * 2026-07-07 (02-RESEARCH.md) and matches CLAUDE.md's Verified Onchain Addresses.
 */
export const REGISTRY_ADDRESS_BY_CHAIN: Record<number, Address> = {
  [sepolia.id]: "0x2f0750Bbb0A246059d80e94c454586a7F27a128e",
};

/** Default (Sepolia) registry address. */
export const REGISTRY_ADDRESS: Address = REGISTRY_ADDRESS_BY_CHAIN[sepolia.id];
