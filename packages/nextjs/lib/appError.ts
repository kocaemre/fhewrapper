import {
  ApprovalFailedError,
  ConfigurationError,
  DecryptionFailedError,
  InsufficientConfidentialBalanceError,
  InsufficientERC20BalanceError,
  NoCiphertextError,
  RelayerRequestFailedError,
  SigningRejectedError,
  TransactionRevertedError,
  ZamaError,
  matchAclRevert,
} from "@zama-fhe/react-sdk";

/**
 * The ONE unified error model (UX-01, CONTEXT Decision A).
 *
 * `toAppError` is the single classifier behind every write/read flow. It maps
 * any thrown value — a typed `@zama-fhe/react-sdk` subclass, an on-chain ACL
 * revert, or a plain wagmi/`Error` — to one `{chip, body, recoverable}` triplet.
 * A raw revert string must NEVER reach the UI (T-06-01): every branch returns
 * curated copy, and the unknown fallback is a safe generic line.
 *
 * The four per-flow maps (`faucetErrors`/`wrapErrors`/`unwrapErrors`/
 * `decryptErrors`) delegate here; the `flow` option tunes only the branches
 * whose copy legitimately differs today so their existing test locks stay green.
 *
 * All error classes + `matchAclRevert` are re-exported by the installed exact
 * `@zama-fhe/react-sdk` 3.0.0 — NO new SDK surface is added.
 */

export type Flow = "faucet" | "wrap" | "unwrap" | "decrypt";

export type AppError = {
  /** Uppercase state-chip label (empty string returns silently to idle). */
  chip: string;
  /** Human-readable body copy — never a raw revert string. */
  body: string;
  /** Whether the user can retry from this state (vs. a terminal failure). */
  recoverable: boolean;
};

/** Extract a lowercased "name + message + shortMessage + details" haystack. */
function errorText(e: unknown): string {
  if (e == null) return "";
  if (typeof e === "string") return e.toLowerCase();
  if (typeof e === "object") {
    const anyE = e as { name?: unknown; message?: unknown; shortMessage?: unknown; details?: unknown };
    return [anyE.name, anyE.shortMessage, anyE.message, anyE.details]
      .filter(v => typeof v === "string")
      .join(" ")
      .toLowerCase();
  }
  return "";
}

/** A wagmi ChainMismatch (not a ZamaError) — matched by text. */
function isChainMismatch(text: string): boolean {
  return (
    text.includes("chainmismatch") ||
    text.includes("does not match the target chain") ||
    (text.includes("chain") && text.includes("match"))
  );
}

/** Per-flow generic-fallback copy (unknown / non-SDK error). */
function genericFallback(flow: Flow): AppError {
  switch (flow) {
    case "wrap":
      return { chip: "WRAP FAILED", body: "Unexpected error while wrapping.", recoverable: true };
    case "unwrap":
      return { chip: "UNWRAP FAILED", body: "Unexpected error while unwrapping.", recoverable: true };
    case "decrypt":
      return { chip: "DECRYPTION FAILED", body: "Unexpected error.", recoverable: true };
    case "faucet":
    default:
      return { chip: "CLAIM FAILED", body: "Could not claim test tokens — please try again.", recoverable: true };
  }
}

export function toAppError(e: unknown, opts?: { flow?: Flow; restricted?: boolean }): AppError {
  const flow: Flow = opts?.flow ?? "wrap";

  // (1) faucet tGBP restricted — surfaced before inspecting the error.
  if (opts?.restricted) {
    return {
      chip: "RESTRICTED",
      body: "This token's faucet is restricted — claim it from the official testnet faucet.",
      recoverable: false,
    };
  }

  // (2) typed SDK subclasses, specific -> generic.
  if (e instanceof SigningRejectedError) {
    return flow === "decrypt"
      ? { chip: "", body: "Signature declined.", recoverable: true }
      : { chip: "DECLINED", body: "You declined the wallet prompt.", recoverable: true };
  }

  if (e instanceof ApprovalFailedError) {
    return { chip: "APPROVAL FAILED", body: "The ERC-20 approval failed — please try again.", recoverable: true };
  }

  if (e instanceof InsufficientERC20BalanceError) {
    return {
      chip: "INSUFFICIENT BALANCE",
      body: "Not enough underlying tokens — use the faucet first.",
      recoverable: true,
    };
  }

  if (e instanceof InsufficientConfidentialBalanceError) {
    return {
      chip: "INSUFFICIENT BALANCE",
      body: "Not enough confidential balance to unwrap that amount.",
      recoverable: true,
    };
  }

  if (e instanceof NoCiphertextError) {
    return { chip: "DECRYPTED BALANCE", body: "0", recoverable: false };
  }

  if (e instanceof ConfigurationError) {
    return { chip: "DECRYPTION FAILED", body: "Unsupported network or configuration.", recoverable: false };
  }

  // The shared no-ACL / relayer group. In decrypt every member is the same
  // graceful "no viewing key" state; in unwrap a relayer failure reads as the
  // decryption service being down; other flows fall through to the generics.
  if (matchAclRevert(e) || e instanceof DecryptionFailedError || e instanceof RelayerRequestFailedError) {
    if (flow === "decrypt") {
      return {
        chip: "NO DECRYPTION ACCESS",
        body: "This token hasn't granted your address a viewing key — some confidential tokens are undecryptable by design.",
        recoverable: true,
      };
    }
    if (flow === "unwrap" && e instanceof RelayerRequestFailedError) {
      return {
        chip: "UNWRAP FAILED",
        body: "The decryption service is unavailable — please try again.",
        recoverable: true,
      };
    }
    // else: fall through to TransactionReverted / generic ZamaError below.
  }

  if (e instanceof TransactionRevertedError) {
    if (flow === "wrap") return { chip: "WRAP FAILED", body: "The wrap transaction reverted.", recoverable: true };
    if (flow === "unwrap")
      return { chip: "UNWRAP FAILED", body: "The unwrap transaction reverted.", recoverable: true };
    // decrypt/faucet: fall through to the generic ZamaError copy.
  }

  if (e instanceof ZamaError) {
    switch (flow) {
      case "wrap":
        return { chip: "WRAP FAILED", body: "The wrap could not be completed.", recoverable: true };
      case "unwrap":
        return { chip: "UNWRAP FAILED", body: "The unwrap could not be completed.", recoverable: true };
      case "decrypt":
        return { chip: "DECRYPTION FAILED", body: "The FHE gateway didn't respond.", recoverable: true };
      case "faucet":
      default:
        return genericFallback(flow);
    }
  }

  // (3) text-based branches for non-SDK (wagmi) errors.
  const text = errorText(e);

  // Chain mismatch applies to every flow.
  if (isChainMismatch(text)) {
    return {
      chip: "WRONG NETWORK",
      body: "Switch your wallet to the Sepolia network and try again.",
      recoverable: true,
    };
  }

  // The faucet path is purely text-based (no SDK on the plain ERC-20 mint).
  if (flow === "faucet") {
    if (text.includes("user rejected") || text.includes("userrejected") || text.includes("denied")) {
      return { chip: "DECLINED", body: "You declined the wallet prompt.", recoverable: true };
    }
    if (text.includes("insufficient funds") || text.includes("insufficientfunds") || text.includes("intrinsic gas")) {
      return {
        chip: "NEEDS GAS",
        body: "You need Sepolia ETH for gas — top up from a Sepolia ETH faucet first.",
        recoverable: true,
      };
    }
    if (text.includes("revert") || text.includes("exceed")) {
      return {
        chip: "CLAIM FAILED",
        body: "Claim failed — amount may exceed the 1,000,000-per-call limit, or this token's mint is restricted.",
        recoverable: true,
      };
    }
  }

  // (4) generic fallback.
  return genericFallback(flow);
}
