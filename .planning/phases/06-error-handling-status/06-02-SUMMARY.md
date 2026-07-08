---
phase: 06-error-handling-status
plan: 02
subsystem: error-handling-status
tags: [toasts, explorer, wrap, unwrap, ux, async-wait]
requires:
  - "06-01 primitives: toAppError, sepoliaTxUrl/ExplorerTxLink, notifyPending/Success/Error"
  - "@zama-fhe/react-sdk 3.0.0 (useShield/useUnshield — already installed; no new SDK)"
provides:
  - "hooks/useWrap.ts::txHash — submitted wrap tx hash (additive return)"
  - "hooks/useUnwrap.ts::txHash — submitted burn tx hash (additive return)"
  - "WrapPanel + UnwrapPanel: pending->success/error toasts + inline explorer link + unified error rows"
  - "UnwrapStageIndicator: explicit reassuring oracle-wait affordance (UX-03)"
affects:
  - "wrap flow (fully treated: toast + explorer + typed error row)"
  - "unwrap flow (fully treated + honest finalized-only success + reassuring async wait)"
tech-stack:
  added: []
  patterns:
    - "Additive txHash return field on the write hooks — no change to the SDK config or stage machine"
    - "Pending toast id held in a ref so the finalized effect is the single honest success point"
    - "Error rows render toAppError({flow}).chip + .body — no raw revert"
key-files:
  created: []
  modified:
    - packages/nextjs/hooks/useWrap.ts
    - packages/nextjs/components/wrap/WrapPanel.tsx
    - packages/nextjs/hooks/useUnwrap.ts
    - packages/nextjs/components/unwrap/UnwrapPanel.tsx
    - packages/nextjs/components/unwrap/UnwrapStageIndicator.tsx
decisions:
  - "Unwrap success toast fires inside the stage === finalized effect (guarded by an early `stage !== finalized` return), not on the promise resolve — strictly gates success to the honest end-state (T-06-06)"
  - "Pending toast id stored in a useRef so all three entry points (unwrap/unwrapAll/resume) share one id that the finalized effect resolves in place"
  - "UX-03 reassurance lives in UnwrapStageIndicator (co-located with the stages) so decrypting/finalizing always render explicit copy beneath the indicator"
  - "Error rows keep the existing red-alert row shell but swap the string body for toAppError chip+body; the old toWrapError/toUnwrapError string maps are no longer imported by the panels"
metrics:
  duration: ~12m
  completed: 2026-07-08
status: complete
---

# Phase 6 Plan 02: Wrap + Unwrap Toasts, Explorer Links, and the Reassuring Async Wait Summary

The wrap and unwrap write flows now carry the full 06-01 status system — a themed pending → success/error toast (success embedding a working `sepolia.etherscan.io/tx/<hash>` link), an inline explorer link while a tx is in flight, and an error row rendered through the unified `toAppError` chip+body model (never a raw revert). The unwrap oracle wait is now an explicit, reassuring "this can take a moment — your funds are safe" affordance, and its success toast is gated exclusively to the honest `finalized` stage (no optimistic success — UNW-02/T-06-06 preserved). UX-02 is now complete across all three write flows (faucet in 06-01; wrap + unwrap here) and UX-03 is delivered.

## What Was Built

### Task 1 — Wrap flow (`ac7e233`)
- **`hooks/useWrap.ts`** — added an additive `txHash: Hex | undefined` field to `UseWrapResult`, returning the existing internal `shieldHash` state (set in `onShieldSubmitted`). The `useShield` config, 4-stage machine, and approval strategy are unchanged; no new SDK surface.
- **`components/wrap/WrapPanel.tsx`** — `onWrap` opens `notifyPending("Wrapping <uSymbol>", ...)`, captures the id, and on the `await wrap()` resolve (`stage === "done"`) replaces it with `notifySuccess({ title: "Wrapped <uSymbol>", hash })` carrying the explorer link; on failure it fires `notifyError` with `toAppError(e, { flow: "wrap" }).body`. The error row now renders the unified `toAppError({flow:'wrap'})` chip + body instead of the old `toWrapError` string. An inline `<ExplorerTxLink hash={txHash} />` shows while busy/done. Untrusted `uSymbol`/`cSymbol` are JSX children only (T-02-01). Below-one-unit warning, on-done `PairCardDecrypt`, and the Wrap/Unwrap toggle are untouched.

### Task 2 — Unwrap flow (`417d668`)
- **`hooks/useUnwrap.ts`** — added an additive `txHash: Hex | undefined` field, captured from the hash passed to `onUnwrapSubmitted` and from the persisted record in `resumePending`. The `useUnshield`/`useUnshieldAll`/`useResumeUnshield` wiring, the honest stage reducer, and the pending-persistence are unchanged.
- **`components/unwrap/UnwrapPanel.tsx`** — a shared `startPendingToast()` opens `notifyPending("Unwrapping <cSymbol>", "Burn, gateway decryption, then finalize — this can take a moment.")` for all three entry points (unwrap / unwrapAll / resume), storing the id in a `useRef`. The **success toast fires only inside the `stage === "finalized"` effect** (guarded by an early `if (stage !== "finalized") return;`), resolving the same toast id in place with the burn `txHash` — no optimistic success. Failures route through a shared `failToast(e)` that renders `toAppError(e, { flow: "unwrap" }).body`. The error row now renders the unified `toAppError({flow:'unwrap'})` chip + body, and an inline `<ExplorerTxLink hash={txHash} />` shows while busy/finalized. The honest finalized-only end-state, the ERC-20 `balanceOf` refetch, `PairCardDecrypt`, the Resume banner, and Unwrap-all are unchanged.
- **`components/unwrap/UnwrapStageIndicator.tsx`** — when the active stage is `decrypting` or `finalizing`, an explicit `role="status"` affordance renders beneath the indicator: "The gateway is publicly decrypting your burn — this can take a moment." / "Releasing your ERC-20 — finalizing on-chain now." + "Your funds are safe; leave this tab open." (UX-03; CONTEXT Decision C) — the oracle wait is never a silent hang or a context-free spinner.

## Verification

- **vitest:** 112 passed / 0 failed (98 prior locks + 06-01's 14 units, all unchanged — this plan adds no new pure logic, only type/build-gated wiring per the established validation architecture).
- **`npm run check-types`:** exit 0 (additive `txHash` returns + shared-primitive wiring; only installed 3.0.0 SDK symbols referenced).
- **`npm run build`:** exit 0; `/wrap` (5.62 kB) and `/unwrap` (6.01 kB) routes still emitted. The only build warnings are the pre-existing `@metamask/sdk` optional-dep (`@react-native-async-storage/async-storage`) and the "NEXT_PUBLIC_ALCHEMY_API_KEY not set" fallback — unrelated to this plan (out of scope, not introduced here).
- **Grep sanity:** no `dangerouslySetInnerHTML` in either panel; the unwrap `notifySuccess` call sits immediately after the `if (stage !== "finalized") return;` guard inside the finalized effect (no optimistic success).

## Threat Mitigations Applied

- **T-06-05 (info disclosure):** wrap/unwrap error rows + error toasts render `toAppError({flow}).body` (curated copy) — no raw revert reaches the UI.
- **T-06-06 (false success):** the unwrap success toast + "arrived" affordance fire ONLY inside the `stage === "finalized"` effect (the finalize-tx resolve); the honest reducer remains the single source of the success signal.
- **T-06-02 (XSS):** all toast/row title/desc/symbol text passed as React children; no `dangerouslySetInnerHTML`.
- **T-06-04 (phishing link):** explorer links reuse the 06-01 host-pinned `sepoliaTxUrl` + `rel="noopener noreferrer"` `ExplorerTxLink`.

## Deviations from Plan

None — plan executed as written. Prettier reformatted the new `UnwrapStageIndicator` fragment indentation (formatting only, no logic change) as part of the standard lint pass.

## Deferred

- Live "each wrap/unwrap error mode surfaces + the reassuring async wait reads reassuring on the deployed URL" check is deferred to `06-UAT.md` per the plan's time-box directive (the two-tx path is SDK/wallet/relayer-owned).

## Known Stubs

None — every toast, explorer link, and error row is wired to live `useWrap`/`useUnwrap` state and real tx hashes.

## Self-Check: PASSED

- All 5 modified source files exist on disk (verified below).
- Both task commits (ac7e233, 417d668) present in history.
