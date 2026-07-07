import { type Address, getAddress, isAddress } from "viem";

/**
 * Pasted-address format validation (DEC-02 input handling, T-03-04 tampering).
 *
 * The /decrypt panel accepts an arbitrary user-supplied string as an ERC-7984
 * token address. This helper is the FIRST trust-boundary gate: it trims the raw
 * input, rejects empty and malformed strings, and normalizes a valid address to
 * its EIP-55 checksummed form via viem `getAddress`. Only the FORMAT is checked
 * here — whether the (valid) address is actually a confidential ERC-7984 token
 * is an on-chain ERC-165 check (`useIsConfidential`) done downstream in the
 * DecryptPanel, so a malformed/empty input never reaches the decrypt engine.
 *
 * Reason strings are the EXACT 03-UI-SPEC error-row copy the input renders.
 */
export interface DecryptTargetResult {
  ok: boolean;
  /** Checksummed address when `ok` — safe to pass to the decrypt hooks. */
  address?: Address;
  /** UI-SPEC reason string when not `ok` (empty vs. malformed). */
  reason?: string;
}

export function validateDecryptTarget(raw: string): DecryptTargetResult {
  const trimmed = raw.trim();

  if (trimmed === "") {
    return { ok: false, reason: "Enter an ERC-7984 address" };
  }

  if (!isAddress(trimmed)) {
    return { ok: false, reason: "NOT A VALID ADDRESS" };
  }

  return { ok: true, address: getAddress(trimmed) };
}
