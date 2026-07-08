---
phase: 06-error-handling-status
type: manual-uat
status: pending
deferred: true
when: end-of-project (single manual session before final submission)
url: https://fhewrapper-nextjs.vercel.app/
requirements: [UX-01, UX-02, UX-03]
resolves: "Live confirmation that every SC1 failure mode surfaces a typed message + toast + explorer link, and that the async unwrap wait reads as reassuring (not a silent hang) on the deployed URL"
---

# Phase 6 — Live-URL Error / Status System Manual UAT (DEFERRED)

The toast rendering, the explorer-link click-through, and the faucet-mint / wrap-`useShield` /
unwrap-`useUnshield` tx paths are wallet-, gas-, and relayer-dependent — the SDK/wagmi/UI own them and
cannot be proven by unit tests (mocking would test the mock). Per the time-boxed directive these live
checks were **intentionally deferred** to a single end-of-project session. The correctness-critical PURE
logic (the unified `toAppError` classifier — every SC1 mode -> typed `{chip, body, recoverable}`, no raw
revert — and the host-pinned `sepoliaTxUrl`) is already locked by vitest, and all automated gates
(check-types, build with `/faucet` + `/wrap` + `/unwrap` emitted, full vitest suite) are green.

Run every check on the LIVE deployed URL, **not** localhost — the real relayer under COEP `require-corp`
is the phase gate. Mark each `[ ]` -> `[x]` and fill results. This phase is an explicitly-judged axis
(no raw reverts + honest async wait), so verify the copy actually reads as human and reassuring.

## Preconditions

- [ ] Latest commit deployed to the live URL (Phase-1 GitHub -> Vercel pipeline).
- [ ] `crossOriginIsolated === true` on load.
- [ ] MetaMask connected on **Sepolia** via the existing ChainGuard/connect flow.
- [ ] Wallet holds some Sepolia ETH for gas; a second, **near-empty** wallet is handy for the low-ETH / gas-failure checks.
- [ ] A registry pair the wallet holds a confidential balance in (or run a wrap first) for the unwrap checks.

## UX-01 — Every failure mode surfaces a typed, human-readable message (no raw revert)

Trigger each mode and confirm the on-screen copy is a curated sentence (chip + body), never a raw revert string:

- [ ] **Missing approval / wrap revert:** attempt a wrap that fails approval or reverts — the error row reads human copy (e.g. approval failed / transaction reverted), not a hex revert.
- [ ] **Insufficient balance (wrap):** wrap more underlying than you hold — copy points you at the faucet.
- [ ] **Insufficient confidential balance (unwrap):** unwrap more than the decrypted balance — copy reads "not enough confidential balance".
- [ ] **Network mismatch:** switch MetaMask off Sepolia — the wrong-network state is communicated (ChainGuard gate and/or a typed "switch to Sepolia" message); no action fires a raw chain error into the UI.
- [ ] **Unsupported / restricted token:** open the faucet row for **tGBP** — it is disabled up-front with the restricted-faucet copy (never a doomed tx).
- [ ] **ACL denial (decrypt):** decrypt an ERC-7984 the wallet has no viewing key for — the **NO DECRYPTION ACCESS** state shows (not an infinite spinner).
- [ ] **Faucet edge — low gas:** from the near-empty wallet, attempt a faucet claim — the "need Sepolia ETH for gas" copy shows.
- [ ] **Faucet edge — over cap:** (if reachable) an over-1,000,000 claim reads the cap copy, not a raw revert.
- [ ] Confirm across ALL of the above: **no raw revert / hex / stack text ever appears** — only curated copy.
- Result: _______________________________________________

## UX-02 — Toasts + tx-stage indicators + explorer links on every write flow

### Faucet
- [ ] Claim a token: a **pending** toast appears on submit, then a **success** toast on the receipt.
- [ ] The success toast (and/or inline link) has a **View on Etherscan ↗** link that opens `sepolia.etherscan.io/tx/<hash>` for the real mint tx.
- [ ] The faucet row shows a **Submit -> Confirm -> Done** stage view consistent with wrap/unwrap.
- Result: _______________________________________________

### Wrap
- [ ] Wrap a token: pending toast on submit -> success toast on the mined wrap, with a working Etherscan link.
- [ ] The 4-stage approve/wrap/confirm/done indicator progresses; an inline explorer link is reachable in-flight.
- [ ] On a forced failure, an **error toast** + the typed error row show human copy.
- Result: _______________________________________________

### Unwrap
- [ ] Unwrap a token: pending toast on submit; the explorer link points at the burn tx.
- [ ] The **success** toast fires ONLY after finalize (see UX-03 below) with a working Etherscan link.
- [ ] On a forced failure, an error toast + typed error row show human copy.
- Result: _______________________________________________

## UX-03 — The async unwrap wait is a visible, reassuring state (never a silent hang)

- [ ] During the unwrap **Decrypting / Finalize** steps, an explicit reassuring affordance is shown (copy on the order of "Gateway is publicly decrypting your burn — this can take a moment. Your funds are safe; leave this open.") — NOT a bare spinner or a frozen screen.
- [ ] **No optimistic success:** neither the success toast nor the "arrived" state appears at the burn-submit or decrypting step — only after the finalize tx completes and the ERC-20 balance increases (UNW-02 preserved).
- [ ] Note the observed decrypting -> finalize latency here (how long the reassuring state is visible): __________ seconds.
- Result: _______________________________________________

## Notes / anomalies

_Record any error copy that reads awkwardly, any missing toast/explorer link, and any moment the async wait
felt like a hang (for Phase-7 polish):_

_______________________________________________

---

## Readiness (surface built — ready to run this UAT)

- **Unified typed model (UX-01):** `lib/appError.ts` `toAppError(e, {flow, restricted})` -> `{chip, body, recoverable}`; the four per-flow maps (`faucetErrors`/`wrapErrors`/`unwrapErrors`/`decryptErrors`) delegate to it. Unit-locked (`appError.test.ts`) for every SC1 mode + no-raw-revert.
- **Status primitives (UX-02):** `components/status/txToast.tsx` (pending/success/error, one reused id, Cellar-themed) + `components/status/ExplorerTxLink.tsx` (host-pinned `sepoliaTxUrl`, unit-locked) + `components/faucet/FaucetStageIndicator.tsx`.
- **Wired flows:** faucet (06-01), wrap + unwrap (06-02) — each with pending/success/error toasts, an explorer link, a stage view, and a unified error row.
- **Async reassurance (UX-03):** `UnwrapStageIndicator` / `UnwrapPanel` present the decrypting/finalizing wait as explicit reassuring copy; the success toast is gated to `stage === "finalized"`.

Automated gates green at phase close: `check-types` exit 0, `next build` emits `/faucet` + `/wrap` + `/unwrap`,
full vitest suite green (98 prior locks + new appError/explorer units). The live error-surface, explorer
click-through, and async-wait reassurance checks above remain wallet/relayer-owned — run this session before
final submission.
