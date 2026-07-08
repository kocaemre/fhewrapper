/**
 * Honest unwrap stage machine (UNW-02 — the phase's central judged behavior).
 *
 * Unwrap is a two-transaction, oracle-decrypted, app-submitted finalize:
 *   1. `unwrap` tx burns the confidential balance (onUnwrapSubmitted)
 *   2. the KMS/relayer publicly decrypts the burn handle (onFinalizing — the
 *      oracle wait; Pitfall 2)
 *   3. the app submits the `finalize` tx with the cleartext + proof
 *      (onFinalizeSubmitted)
 *   4. the finalize-tx receipt resolves — ONLY NOW have the ERC-20 tokens
 *      actually arrived
 *
 * Success (`finalized`) is gated EXCLUSIVELY on the `resolved` event (the
 * finalize-tx receipt). Every earlier event — `unwrap-submitted`, `finalizing`,
 * `finalize-submitted` — is explicitly NOT success. This is the "no optimistic
 * success" guarantee, unit-locked in `unwrapStages.test.ts`. The reducer is a
 * PURE function so the correctness is provable in-phase; the live SDK/wallet/
 * relayer tx path is proven in 05-UAT.
 */
export type UnwrapStage = "idle" | "requesting" | "decrypting" | "finalizing" | "finalized" | "error";

export type UnwrapEvent =
  "start" | "unwrap-submitted" | "finalizing" | "finalize-submitted" | "resolved" | "error" | "reset";

/**
 * Pure reducer over the honest unwrap machine.
 *
 * - `start` → requesting (burn tx being prepared/submitted)
 * - `unwrap-submitted` → requesting (burn tx sent — NOT success)
 * - `finalizing` → decrypting (explicit oracle-wait state; Pitfall 2)
 * - `finalize-submitted` → finalizing (finalize tx in flight — NOT success)
 * - `resolved` → finalized (finalize-tx receipt — the ONLY success point)
 * - `error` → error (from any stage)
 * - `reset` → idle
 */
export function nextUnwrapStage(_current: UnwrapStage, event: UnwrapEvent): UnwrapStage {
  switch (event) {
    case "start":
      return "requesting";
    case "unwrap-submitted":
      return "requesting";
    case "finalizing":
      return "decrypting";
    case "finalize-submitted":
      return "finalizing";
    case "resolved":
      return "finalized";
    case "error":
      return "error";
    case "reset":
      return "idle";
    default:
      return _current;
  }
}

/**
 * The UNW-02 no-optimistic-success guarantee: an unwrap is successful ONLY when
 * the finalize-tx has resolved (`finalized`). Every other stage — including the
 * burn-submitted and oracle-wait stages — is NOT success.
 */
export function isUnwrapSuccess(stage: UnwrapStage): boolean {
  return stage === "finalized";
}
