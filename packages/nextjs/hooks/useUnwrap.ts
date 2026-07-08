"use client";

import { useCallback, useState } from "react";
import {
  type Address,
  DecryptionFailedError,
  type Hex,
  RelayerRequestFailedError,
  TransactionRevertedError,
  useResumeUnshield,
  useUnshield,
  useUnshieldAll,
} from "@zama-fhe/react-sdk";
import { forgetPendingUnwrap, readPendingUnwrap, rememberPendingUnwrap } from "~~/lib/pendingUnshield";
import { type UnwrapStage, nextUnwrapStage } from "~~/lib/unwrapStages";

/**
 * Oracle-wait backoff (UNW-01 root-cause fix — the finalize-too-early revert).
 *
 * The confidential `unwrap` burn (tx #1) requests a PUBLIC decryption of the
 * burn handle from the Zama KMS. That decryption is ASYNCHRONOUS on Sepolia
 * (seconds → a couple of minutes). The app-submitted `finalize` (tx #2) needs
 * the cleartext + the KMS decryption proof; if it is simulated/submitted BEFORE
 * the KMS has signed the now-publicly-decryptable handle it reverts IMMEDIATELY
 * — a wagmi/viem `estimateGas` simulation revert (no gas spent, no tx mined),
 * which is exactly the "reverts direkt, no wait" symptom.
 *
 * The burn is idempotent and already persisted, so the safe fix is to POLL:
 * re-run the finalize via `useResumeUnshield` (which reuses the existing burn
 * tx — it NEVER re-burns) with exponential backoff until the oracle result is
 * ready and the finalize succeeds. We only retry transient not-ready failures;
 * everything else fails fast. If the whole window elapses we surface the real
 * error — success is NEVER faked (UNW-02).
 */
const FINALIZE_MAX_ATTEMPTS = 15;
const FINALIZE_BASE_DELAY_MS = 2_500;
const FINALIZE_MAX_DELAY_MS = 15_000;

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * A finalize failure that means "the KMS public decryption of the burn handle
 * is not ready yet" — transient and retryable. The pre-oracle finalize reverts
 * on simulation (`TransactionRevertedError`) or the relayer reports the handle
 * as not-yet-decryptable (`DecryptionFailedError` / `RelayerRequestFailedError`).
 * A user rejection, insufficient-balance, config, etc. are NOT here — those must
 * fail fast rather than spin for minutes.
 */
function isFinalizeNotReady(e: unknown): boolean {
  return (
    e instanceof TransactionRevertedError ||
    e instanceof DecryptionFailedError ||
    e instanceof RelayerRequestFailedError
  );
}

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
  /**
   * The submitted burn tx hash (set on `onUnwrapSubmitted`, and on `resumePending`
   * from the persisted record), so the UI can render a live explorer link and
   * carry the real tx into the finalized success toast. Additive field only — the
   * honest stage machine and pending-persistence are unchanged.
   */
  txHash: Hex | undefined;
}

export function useUnwrap(confidentialAddr: Address): UseUnwrapResult {
  const [stage, setStage] = useState<UnwrapStage>("idle");
  const [txHash, setTxHash] = useState<Hex | undefined>();

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
        setTxHash(txHash); // surface the burn tx for the explorer link / success toast
        apply("unwrap-submitted"); // stays `requesting` — NOT success
      },
      onFinalizing: () => apply("finalizing"), // → `decrypting` (oracle wait)
      onFinalizeSubmitted: () => apply("finalize-submitted"), // → `finalizing` (still NOT success)
    }),
    [apply, confidentialAddr],
  );

  /**
   * Finalize an already-burned unwrap, polling through the async oracle wait.
   *
   * Re-runs `useResumeUnshield` (reuses the existing burn tx — NEVER re-burns)
   * with exponential backoff, retrying ONLY the transient "oracle not ready"
   * finalize reverts. Stays in the `decrypting` stage across the wait so the
   * indicator reflects the real KMS decryption. Resolves only on the finalize
   * receipt; rethrows the real error if the window elapses (no faked success).
   */
  const finalizeWithBackoff = useCallback(
    async (unwrapTxHash: Hex): Promise<void> => {
      let lastError: unknown;
      for (let attempt = 0; attempt < FINALIZE_MAX_ATTEMPTS; attempt++) {
        try {
          apply("finalizing"); // → `decrypting` (honest oracle-wait state)
          await resume.mutateAsync({ unwrapTxHash, ...callbacks() });
          return; // finalize-tx receipt — the ONLY success point
        } catch (e) {
          lastError = e;
          if (!isFinalizeNotReady(e)) throw e; // fail fast on non-transient errors
          const delay = Math.min(FINALIZE_BASE_DELAY_MS * 2 ** attempt, FINALIZE_MAX_DELAY_MS);
          await sleep(delay); // oracle not ready yet — back off and re-poll
        }
      }
      throw lastError; // window elapsed — surface the real revert, never fake success
    },
    [apply, callbacks, resume],
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
        // If the burn already landed (persisted tx hash) and finalize only
        // failed because the oracle wasn't ready, don't strand the funds —
        // poll the finalize via resume until the KMS decryption is ready.
        const pending = await readPendingUnwrap(confidentialAddr);
        if (pending && isFinalizeNotReady(e)) {
          try {
            await finalizeWithBackoff(pending);
            apply("resolved");
            await forgetPendingUnwrap(confidentialAddr);
            return;
          } catch (resumeErr) {
            apply("error");
            throw resumeErr;
          }
        }
        // Keep the pending record so the interrupted unwrap can resume.
        apply("error");
        throw e; // classify via toUnwrapError at the UI layer
      }
    },
    [apply, callbacks, confidentialAddr, finalizeWithBackoff, unshield],
  );

  const unwrapAll = useCallback(async (): Promise<void> => {
    try {
      apply("start");
      await unshieldAll.mutateAsync({ ...callbacks() });
      apply("resolved");
      await forgetPendingUnwrap(confidentialAddr);
    } catch (e) {
      const pending = await readPendingUnwrap(confidentialAddr);
      if (pending && isFinalizeNotReady(e)) {
        try {
          await finalizeWithBackoff(pending);
          apply("resolved");
          await forgetPendingUnwrap(confidentialAddr);
          return;
        } catch (resumeErr) {
          apply("error");
          throw resumeErr;
        }
      }
      apply("error");
      throw e;
    }
  }, [apply, callbacks, confidentialAddr, finalizeWithBackoff, unshieldAll]);

  const resumePending = useCallback(async (): Promise<void> => {
    const unwrapTxHash = await readPendingUnwrap(confidentialAddr);
    if (!unwrapTxHash) return; // nothing to resume
    try {
      setTxHash(unwrapTxHash); // surface the persisted burn tx for the explorer link
      // burn already done — poll the finalize through the async oracle wait.
      await finalizeWithBackoff(unwrapTxHash);
      apply("resolved");
      await forgetPendingUnwrap(confidentialAddr);
    } catch (e) {
      apply("error");
      throw e;
    }
  }, [apply, confidentialAddr, finalizeWithBackoff]);

  const reset = useCallback(() => setStage("idle"), []);

  const isPending = unshield.isPending || unshieldAll.isPending || resume.isPending;

  return { stage, unwrap, unwrapAll, resumePending, isPending, reset, txHash };
}
