import {
  ConfigurationError,
  DecryptionFailedError,
  NoCiphertextError,
  RelayerRequestFailedError,
  SigningRejectedError,
  ZamaError,
  isZeroHandle,
  matchAclRevert,
} from "@zama-fhe/react-sdk";

/**
 * Decrypt error taxonomy (DEC-04).
 *
 * Maps every relevant `ZamaError` subclass (plus on-chain ACL reverts and
 * unknowns) to the exact 03-UI-SPEC chip/body/recoverable triplet the UI
 * renders. Classification is by `instanceof` against the typed subclasses plus
 * `matchAclRevert` for on-chain ACL reverts — never string-matching raw revert
 * messages (Don't-Hand-Roll; 03-RESEARCH error taxonomy).
 *
 * Ordering: SigningRejectedError and the no-ACL group are caught BEFORE the
 * generic ZamaError fallthrough. All error classes and helpers are re-exported
 * by @zama-fhe/react-sdk (installed exact 3.0.0 — verified on disk).
 */
export type DecryptErrorInfo = {
  /** Uppercase state-chip label (empty string returns silently to idle). */
  chip: string;
  /** Body copy shown beneath the chip. */
  body: string;
  /** Whether the user can retry from this state (vs. a terminal failure). */
  recoverable: boolean;
};

export function toDecryptError(e: unknown): DecryptErrorInfo {
  // Permit rejected — returns silently to idle (DEC-04 permit-rejected).
  if (e instanceof SigningRejectedError) {
    return { chip: "", body: "Signature declined.", recoverable: true };
  }

  // No-ACL access (DEC-04): the relayer rejects a handle the wallet can't view,
  // or an on-chain ACL revert. All map to the same graceful "no access" state.
  if (matchAclRevert(e) || e instanceof DecryptionFailedError || e instanceof RelayerRequestFailedError) {
    return {
      chip: "NO DECRYPTION ACCESS",
      body: "This token hasn't granted your address a viewing key — some confidential tokens are undecryptable by design.",
      recoverable: true,
    };
  }

  // Never shielded — a valid zero balance, not an error.
  if (e instanceof NoCiphertextError) {
    return { chip: "DECRYPTED BALANCE", body: "0", recoverable: false };
  }

  // Unsupported network / invalid SDK configuration — terminal.
  if (e instanceof ConfigurationError) {
    return { chip: "DECRYPTION FAILED", body: "Unsupported network or configuration.", recoverable: false };
  }

  // Any other typed SDK failure — gateway didn't respond; retryable.
  if (e instanceof ZamaError) {
    return { chip: "DECRYPTION FAILED", body: "The FHE gateway didn't respond.", recoverable: true };
  }

  // Unknown / non-SDK error.
  return { chip: "DECRYPTION FAILED", body: "Unexpected error.", recoverable: true };
}

/**
 * Zero-handle short-circuit (DEC-04): a never-initialized encrypted balance has
 * the SDK `ZERO_HANDLE` and renders as `0` — no relayer round-trip, not an error.
 */
export function isZeroBalance(handle: string): boolean {
  return isZeroHandle(handle);
}
