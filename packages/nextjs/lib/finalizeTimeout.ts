import type { Hex } from "viem";

/**
 * Honest "oracle still decrypting" timeout (UNW-01 / UNW-02).
 *
 * The confidential `unwrap` burn (tx #1) is confirmed and persisted, but the
 * Zama KMS public decryption of the burn handle has NOT been published yet, so
 * the app-submitted `finalize` (tx #2) cannot land. This is NOT a revert and
 * NOT a lost-funds condition — the burn is idempotently resumable. We surface a
 * distinct, non-scary error so the UI can tell the user their tokens are safe
 * and to press "Resume interrupted unwrap" again shortly, instead of showing a
 * misleading "transaction reverted".
 *
 * Deliberately a plain `Error` (NOT a `ZamaError`) so it does not collide with
 * the SDK's typed revert/decryption classes in `toAppError`, and success is
 * never faked — the finalize genuinely has not completed.
 */
export class FinalizeStillPendingError extends Error {
  /** The persisted burn tx hash — the unwrap is resumable from this. */
  readonly unwrapTxHash: Hex;

  constructor(unwrapTxHash: Hex, cause?: unknown) {
    super("The unwrap burn is confirmed, but the Zama oracle hasn't published the decryption yet.");
    this.name = "FinalizeStillPendingError";
    this.unwrapTxHash = unwrapTxHash;
    if (cause !== undefined) {
      (this as { cause?: unknown }).cause = cause;
    }
  }
}
