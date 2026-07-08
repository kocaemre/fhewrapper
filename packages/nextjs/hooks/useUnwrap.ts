"use client";

import { useCallback, useState } from "react";
import { type Address, type Hex, useResumeUnshield, useUnshield, useUnshieldAll } from "@zama-fhe/react-sdk";
import { forgetPendingUnwrap, readPendingUnwrap, rememberPendingUnwrap } from "~~/lib/pendingUnshield";
import { type UnwrapStage, nextUnwrapStage } from "~~/lib/unwrapStages";

/**
 * Honest unwrap engine (UNW-01 / UNW-02).
 *
 * Wraps the installed EXACT 3.0.0 `@zama-fhe/react-sdk` hooks — verified on disk
 * at `node_modules/@zama-fhe/react-sdk/dist/index.d.ts`:
 *   useUnshield(config, options)       @ 698   config = { tokenAddress, wrapperAddress }
 *                                              mutateAsync(UnshieldParams { amount: bigint } & UnshieldCallbacks)
 *   useUnshieldAll(config, options)    @ 719   mutateAsync(UnshieldAllParams | void)  — operates on the balance handle
 *   useResumeUnshield(config, options) @ 740   mutateAsync(ResumeUnshieldParams { unwrapTxHash: Hex })
 *
 * `useUnshield` does the two-transaction orchestration in ONE mutation — the
 * `unwrap` burn tx, the KMS/relayer public decryption of the burn handle, and
 * the app-submitted `finalize` tx — firing `onUnwrapSubmitted` → `onFinalizing`
 * → `onFinalizeSubmitted` along the way and RESOLVING only after the finalize-tx
 * receipt. Do NOT hand-roll the two-tx flow (RESEARCH "Don't Hand-Roll"), and do
 * NOT add a `setOperator`/operator-approval step — the FHE inputProof grants the
 * wrapper's ACL for a self-unwrap (RESEARCH ACL section, T-05-04).
 *
 * The honest machine (`lib/unwrapStages.ts`) gates success EXCLUSIVELY on the
 * mutation resolve (`resolved` → `finalized`): submitting the burn, waiting on
 * the oracle, and submitting the finalize are all explicitly NOT success — the
 * UNW-02 no-optimistic-success guarantee. Pending state is persisted on
 * `onUnwrapSubmitted` and cleared ONLY on finalize resolve; it is kept on error
 * so an interrupted unwrap can be resumed (never strand funds; Pitfall 3).
 *
 * For these registry pairs the ERC-7984 confidential token IS the
 * ERC7984ERC20Wrapper, so both config addresses are the confidential address
 * (mirrors useWrap's A5 note).
 *
 * The tx path itself is SDK/wallet/relayer-owned and proven live in 05-UAT (this
 * hook is type-gated, not unit-mocked — `check-types` proves only verified
 * installed 3.0.0 symbols are referenced).
 */
export interface UseUnwrapResult {
  /** Current stage of the honest idle → requesting → decrypting → finalizing → finalized machine. */
  stage: UnwrapStage;
  /**
   * Unwrap `amount` (plaintext confidential base units; the hook encrypts +
   * proves). Resolves ONLY after the finalize-tx receipt; sets `stage` to
   * `error` and rethrows on failure (classify with `toUnwrapError` at the UI).
   */
  unwrap: (amount: bigint) => Promise<void>;
  /** Unwrap the entire confidential balance — operates on the handle, no decrypt required. */
  unwrapAll: () => Promise<void>;
  /**
   * Resume a burned-but-unfinalized unwrap persisted from a prior session
   * (never strand funds). No-op when there is no pending record.
   */
  resumePending: () => Promise<void>;
  /** Whether any unwrap/finalize mutation is in flight. */
  isPending: boolean;
  /** Reset the machine back to `idle`. */
  reset: () => void;
}

export function useUnwrap(confidentialAddr: Address): UseUnwrapResult {
  const [stage, setStage] = useState<UnwrapStage>("idle");

  const config = { tokenAddress: confidentialAddr, wrapperAddress: confidentialAddr };

  const unshield = useUnshield(config);
  const unshieldAll = useUnshieldAll(config);
  const resume = useResumeUnshield(config);

  const apply = useCallback((event: Parameters<typeof nextUnwrapStage>[1]) => {
    setStage(prev => nextUnwrapStage(prev, event));
  }, []);

  // Shared honest-machine callbacks — success is NEVER signalled here, only on
  // the mutation resolve below (UNW-02).
  const callbacks = useCallback(
    () => ({
      onUnwrapSubmitted: (txHash: Hex) => {
        // Persist BEFORE advancing: the burn is live but the tokens have not
        // arrived — a tab close here must be recoverable (Pitfall 3).
        void rememberPendingUnwrap(confidentialAddr, txHash);
        apply("unwrap-submitted"); // stays `requesting` — NOT success
      },
      onFinalizing: () => apply("finalizing"), // → `decrypting` (oracle wait)
      onFinalizeSubmitted: () => apply("finalize-submitted"), // → `finalizing` (still NOT success)
    }),
    [apply, confidentialAddr],
  );

  const unwrap = useCallback(
    async (amount: bigint): Promise<void> => {
      try {
        apply("start");
        await unshield.mutateAsync({ amount, ...callbacks() });
        // Resolves ONLY after the finalize-tx receipt — the ONLY success point.
        apply("resolved");
        await forgetPendingUnwrap(confidentialAddr);
      } catch (e) {
        // Keep the pending record so the interrupted unwrap can resume.
        apply("error");
        throw e; // classify via toUnwrapError at the UI layer
      }
    },
    [apply, callbacks, confidentialAddr, unshield],
  );

  const unwrapAll = useCallback(async (): Promise<void> => {
    try {
      apply("start");
      await unshieldAll.mutateAsync({ ...callbacks() });
      apply("resolved");
      await forgetPendingUnwrap(confidentialAddr);
    } catch (e) {
      apply("error");
      throw e;
    }
  }, [apply, callbacks, confidentialAddr, unshieldAll]);

  const resumePending = useCallback(async (): Promise<void> => {
    const unwrapTxHash = await readPendingUnwrap(confidentialAddr);
    if (!unwrapTxHash) return; // nothing to resume
    try {
      apply("finalizing"); // burn already done — jump to the oracle-wait state
      await resume.mutateAsync({ unwrapTxHash, ...callbacks() });
      apply("resolved");
      await forgetPendingUnwrap(confidentialAddr);
    } catch (e) {
      apply("error");
      throw e;
    }
  }, [apply, callbacks, confidentialAddr, resume]);

  const reset = useCallback(() => setStage("idle"), []);

  const isPending = unshield.isPending || unshieldAll.isPending || resume.isPending;

  return { stage, unwrap, unwrapAll, resumePending, isPending, reset };
}
