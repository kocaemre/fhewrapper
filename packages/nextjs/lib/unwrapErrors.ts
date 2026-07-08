import {
  InsufficientConfidentialBalanceError,
  RelayerRequestFailedError,
  SigningRejectedError,
  TransactionRevertedError,
  ZamaError,
} from "@zama-fhe/react-sdk";

/**
 * Unwrap error taxonomy (UNW-01 messaging).
 *
 * Maps every unwrap/finalize-flow `ZamaError` subclass (plus unknowns) to a
 * single line of readable copy. Classification is by `instanceof` against the
 * typed subclasses — never string-matching raw revert text. All error classes
 * are re-exported by `@zama-fhe/react-sdk` (installed exact 3.0.0).
 *
 * Ordering: the specific subclasses are caught BEFORE the generic `ZamaError`
 * fallthrough; non-SDK errors map to the unknown copy last.
 */
export function toUnwrapError(e: unknown): string {
  // User rejected the wallet prompt (the burn or the finalize signature).
  if (e instanceof SigningRejectedError) {
    return "You declined the wallet prompt.";
  }

  // Not enough confidential balance to unwrap the requested amount.
  if (e instanceof InsufficientConfidentialBalanceError) {
    return "Not enough confidential balance to unwrap that amount.";
  }

  // The KMS/relayer decryption request for the burn handle failed.
  if (e instanceof RelayerRequestFailedError) {
    return "The decryption service is unavailable — please try again.";
  }

  // The unwrap or finalize transaction reverted on-chain.
  if (e instanceof TransactionRevertedError) {
    return "The unwrap transaction reverted.";
  }

  // Any other typed SDK failure.
  if (e instanceof ZamaError) {
    return "The unwrap could not be completed.";
  }

  // Unknown / non-SDK error.
  return "Unexpected error while unwrapping.";
}
