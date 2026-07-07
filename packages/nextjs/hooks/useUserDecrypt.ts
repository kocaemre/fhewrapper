"use client";

import { useCallback, useEffect, useState } from "react";
import { type Address, useAllow, useConfidentialBalance, useIsAllowed } from "@zama-fhe/react-sdk";
import { zeroAddress } from "viem";
import { useAccount, useChainId } from "wagmi";
import { sepolia } from "wagmi/chains";

/**
 * Shared user-decryption engine (DEC-01 / DEC-03 / DEC-04).
 *
 * Wraps the installed EXACT 3.0.0 `@zama-fhe/react-sdk` primitives into a
 * 4-stage state machine with an EXPLICIT reveal trigger (no auto-decrypt on
 * mount, per CONTEXT decision A). Reused by `PairCardDecrypt` here and by the
 * paste panel (03-03) + wrap/unwrap result surfaces (Phases 4/5).
 *
 *   useAllow            — signs the ONE reusable, non-token-specific EIP-712
 *                         permit (UserDecryptRequestVerification, assembled by
 *                         the SDK; cached in IndexedDB for sessionTTL). DEC-03.
 *   useIsAllowed        — reports whether a cached in-window permit already
 *                         covers the token → drives the "skip signing" path and
 *                         the permit indicator. DEC-03.
 *   useConfidentialBalance — returns the DECRYPTED cleartext bigint directly;
 *                         gated by `enabled` so the relayer is only hit on an
 *                         explicit reveal. DEC-01.
 *
 * Do NOT hand-assemble EIP-712 / strip 0x / manage keypairs — useAllow owns all
 * of that (Don't-Hand-Roll; DEC-03 correctness).
 *
 * W2: `useIsAllowed` requires a NON-EMPTY `[Address, ...Address[]]` tuple — an
 * empty array fails check-types. When no token is set we pass `zeroAddress`
 * (a cheap local IndexedDB read that simply reports "no permit"); the actual
 * decrypt is still gated by the `enabled` flag below, so no relayer call fires.
 */
export type DecryptStage = "idle" | "signing" | "decrypting" | "revealed" | "error";

export interface UseUserDecryptOptions {
  /** The confidential token's own decimals — passed through for callers that
   *  format the returned cleartext (never hardcode 18; Pitfall 5). */
  decimals: number;
}

export interface UseUserDecryptResult {
  stage: DecryptStage;
  /** Explicit trigger: grants the permit if missing, then decrypts. */
  reveal: () => Promise<void>;
  /** Return to idle and disable the balance query (e.g. "Decrypt another"). */
  reset: () => void;
  /** Decrypted cleartext balance (base units) once revealed. */
  value: bigint | undefined;
  /** The underlying error (permit rejection or decrypt/relayer failure). */
  error: unknown;
  /** Whether a cached in-window EIP-712 permit already covers the token. */
  hasPermit: boolean | undefined;
  /** Whether the balance decrypt query is currently in flight. */
  isFetching: boolean;
  /** The token's decimals, echoed for formatting convenience. */
  decimals: number;
}

export function useUserDecrypt(tokenAddress: Address | undefined, opts: UseUserDecryptOptions): UseUserDecryptResult {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const onSepolia = chainId === sepolia.id;

  const [enabled, setEnabled] = useState(false); // explicit trigger — no auto-decrypt
  const [stage, setStage] = useState<DecryptStage>("idle");
  const [caughtError, setCaughtError] = useState<unknown>(null);

  // DEC-03: single reusable, non-token-specific EIP-712 permit.
  const { mutateAsync: allow } = useAllow();
  const { data: hasPermit } = useIsAllowed({ contractAddresses: [tokenAddress ?? zeroAddress] });

  // DEC-01: returns the decrypted cleartext bigint; only active on explicit reveal.
  const {
    data: value,
    isFetching,
    error: queryError,
  } = useConfidentialBalance(
    { tokenAddress: tokenAddress ?? zeroAddress },
    { enabled: enabled && !!tokenAddress && isConnected && onSepolia },
  );

  const reveal = useCallback(async () => {
    if (!tokenAddress || !isConnected || !onSepolia) return;
    try {
      setCaughtError(null);
      if (!hasPermit) {
        setStage("signing");
        await allow([tokenAddress]); // one wallet prompt; cached for sessionTTL (DEC-03)
      }
      setStage("decrypting");
      setEnabled(true); // triggers useConfidentialBalance
    } catch (e) {
      // e.g. SigningRejectedError — surfaced via toDecryptError at the UI layer.
      setCaughtError(e);
      setStage("error");
    }
  }, [tokenAddress, isConnected, onSepolia, hasPermit, allow]);

  const reset = useCallback(() => {
    setEnabled(false);
    setCaughtError(null);
    setStage("idle");
  }, []);

  // Settle the stage once the balance query resolves — never a hanging spinner (DEC-04).
  useEffect(() => {
    if (!enabled || isFetching) return;
    if (queryError) {
      setStage("error");
      return;
    }
    if (value !== undefined) {
      setStage("revealed");
    }
  }, [enabled, isFetching, queryError, value]);

  return {
    stage,
    reveal,
    reset,
    value,
    error: caughtError ?? queryError ?? null,
    hasPermit,
    isFetching,
    decimals: opts.decimals,
  };
}
