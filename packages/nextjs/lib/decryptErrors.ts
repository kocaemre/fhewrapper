import { type AppError, toAppError } from "./appError";
import { isZeroHandle } from "@zama-fhe/react-sdk";

/**
 * Decrypt error taxonomy (DEC-04).
 *
 * Delegates to the unified `toAppError` classifier (CONTEXT Decision A) under
 * the `"decrypt"` flow. `toAppError` reproduces the exact 03-UI-SPEC
 * chip/body/recoverable triplet for every relevant `ZamaError` subclass plus
 * on-chain ACL reverts (`matchAclRevert`) — classification stays by
 * `instanceof`, never string-matching raw revert messages.
 */

/** Re-exported for callers that referenced the decrypt-specific info type. */
export type DecryptErrorInfo = AppError;

export function toDecryptError(e: unknown): DecryptErrorInfo {
  return toAppError(e, { flow: "decrypt" });
}

/**
 * Zero-handle short-circuit (DEC-04): a never-initialized encrypted balance has
 * the SDK `ZERO_HANDLE` and renders as `0` — no relayer round-trip, not an error.
 */
export function isZeroBalance(handle: string): boolean {
  return isZeroHandle(handle);
}
