/**
 * Sepolia block-explorer URL helpers (UX-02, T-06-03/T-06-04).
 *
 * The host is PINNED to the `SEPOLIA_EXPLORER` constant (Sepolia chainId
 * 11155111) so an outbound "View on Etherscan" link can never be pointed at an
 * arbitrary origin. Both helpers validate their input against a strict 0x-hex
 * pattern and return `undefined` for anything malformed — the caller renders
 * NOTHING rather than a junk link.
 */

export const SEPOLIA_EXPLORER = "https://sepolia.etherscan.io";

const TX_HASH_RE = /^0x[0-9a-fA-F]{64}$/;
const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

/** Sepolia Etherscan tx URL for a well-formed 32-byte hash, else `undefined`. */
export function sepoliaTxUrl(hash?: string): string | undefined {
  if (!hash || !TX_HASH_RE.test(hash)) return undefined;
  return `${SEPOLIA_EXPLORER}/tx/${hash}`;
}

/** Sepolia Etherscan address URL for a well-formed 20-byte address, else `undefined`. */
export function sepoliaAddressUrl(address?: string): string | undefined {
  if (!address || !ADDRESS_RE.test(address)) return undefined;
  return `${SEPOLIA_EXPLORER}/address/${address}`;
}
