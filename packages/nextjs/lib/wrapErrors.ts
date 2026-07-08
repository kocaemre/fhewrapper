import {
  ApprovalFailedError,
  InsufficientERC20BalanceError,
  SigningRejectedError,
  TransactionRevertedError,
  ZamaError,
} from "@zama-fhe/react-sdk";

/**
 * Wrap error taxonomy (WRP-01 messaging).
 *
 * Maps every wrap-flow `ZamaError` subclass (plus unknowns) to a single line of
 * readable copy. Classification is by `instanceof` against the typed subclasses —
 * never string-matching raw revert text (04-RESEARCH "Don't Hand-Roll"). All
 * error classes are re-exported by `@zama-fhe/react-sdk` (installed exact 3.0.0).
 *
 * Ordering: the specific subclasses are caught BEFORE the generic `ZamaError`
 * fallthrough; non-SDK errors map to the unknown copy last.
 */
export function toWrapError(e: unknown): string {
  // User rejected the wallet prompt (approve or wrap signature).
  if (e instanceof SigningRejectedError) {
    return "You declined the wallet prompt.";
  }

  // Not enough underlying ERC-20 to shield — point them at the faucet.
  if (e instanceof InsufficientERC20BalanceError) {
    return "Not enough underlying tokens — use the faucet first.";
  }

  // The ERC-20 approval transaction failed.
  if (e instanceof ApprovalFailedError) {
    return "The ERC-20 approval failed — please try again.";
  }

  // The wrap transaction reverted on-chain.
  if (e instanceof TransactionRevertedError) {
    return "The wrap transaction reverted.";
  }

  // Any other typed SDK failure.
  if (e instanceof ZamaError) {
    return "The wrap could not be completed.";
  }

  // Unknown / non-SDK error.
  return "Unexpected error while wrapping.";
}
