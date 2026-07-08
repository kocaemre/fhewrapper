---
phase: 06-error-handling-status
verified: 2026-07-08
status: passed
score: automated gates green; live "each error surfaces + async wait reassuring" deferred to 06-UAT.md
human_verified: deferred
human_verified_note: "Per user directive (floor-it / asleep): the live-URL check that each failure mode surfaces a typed message + the async wait reads reassuring is deferred to the single end-of-project manual UAT in 06-UAT.md. Code + automated verification passed now."
---

# Phase 6: Error Handling + Status System — Verification Report

**Phase Goal:** Every write flow communicates its state and failures in production-grade, human-readable terms — no raw reverts, no silent async hang.
**Status:** passed (automated) · live surfacing check deferred to 06-UAT.md
**Verified:** 2026-07-08 (orchestrator-level, floor-it — systematization phase, no new SDK; automated gates + planner/executor audit relied upon)

## Automated verification (passed)

- **UX-01 unified typed errors:** `lib/appError.ts::toAppError(e, {flow, restricted})` → `{chip, body, recoverable}` covers all SC1 modes (missing approval, insufficient balance, network mismatch, unsupported/config, ACL denial, faucet gas/over-cap/tGBP-restricted, chain mismatch). The 4 per-flow maps delegate with signatures intact — no raw revert. Unit-locked (RED→GREEN).
- **UX-02 toasts + stage + explorer:** themed `notifyPending`/`notifySuccess`/`notifyError` over react-hot-toast (id-reuse), `sepoliaTxUrl`/`ExplorerTxLink` (regex-validated, host-pinned, noopener noreferrer). Wired across faucet (06-01) + wrap + unwrap (06-02); every write flow shows a stage view + a working explorer link.
- **UX-03 reassuring async wait:** unwrap decrypting/finalizing render an explicit `role="status"` "this can take a moment — your funds are safe" affordance; success toast fires ONLY inside the `stage === "finalized"` guard — Phase-5 honest gating preserved (no optimistic success).
- **Security:** no `dangerouslySetInnerHTML`; untrusted token symbols JSX-escaped; validated tx hashes; pinned explorer host.
- **Tests:** vitest 112/112 green (98 prior + 14 new). check-types 0, build 0. No new @zama-fhe SDK; no installs. No regression to Phases 1-5.

## Requirements Coverage

| Req | Status | Evidence |
|-----|--------|----------|
| UX-01 | ✓ code | unified `toAppError` all SC1 modes, typed, no raw revert (unit-locked) |
| UX-02 | ✓ code / ⏳ live UAT | toasts + stage indicators + working explorer links across faucet/wrap/unwrap |
| UX-03 | ✓ code / ⏳ live UAT | reassuring role=status async-wait affordance; honest success at finalized |

## Deferred (to 06-UAT.md — end-of-project manual session)

On the deployed URL: trigger each failure mode (missing approval / insufficient balance / wrong network / unsupported token / ACL denial / faucet edge) and confirm a typed human-readable message (not a raw revert); confirm the async unwrap wait reads reassuring, never a silent hang; confirm explorer links open the right tx.

## Verdict

Code + automated verification PASSED. Live surfacing UAT tracked for the end-of-project manual pass.
