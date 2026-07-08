---
phase: 05-unwrap-async-finalize
verified: 2026-07-08
status: passed
score: automated gates green; live full-loop (wrap→decrypt→unwrap→ERC-20 arrives) deferred to 05-UAT.md
human_verified: deferred
human_verified_note: "Per user directive (floor-it / asleep): the live two-tx unwrap→finalize→ERC-20-arrives proof + the full wrap→decrypt→unwrap loop (SC1-4) are deferred to the single end-of-project manual UAT in 05-UAT.md. Code + automated verification passed now."
---

# Phase 5: Unwrap (async finalize) — Verification Report

**Phase Goal:** A judge can unwrap an ERC-7984 back to its ERC-20, with the two-step async finalize modeled honestly (success shown only when the ERC-20 actually arrives) — closing the wrap→decrypt→unwrap loop.
**Status:** passed (automated) · live full-loop deferred to 05-UAT.md
**Verified:** 2026-07-08 (orchestrator-level, floor-it — per-phase verifier skipped; automated gates + planner/executor on-disk symbol verification relied upon)

## Automated verification (passed)

- **Async model resolved + correct:** research proved finalize is APP-DRIVEN (two txs: `unwrap` burn+decrypt-request → `finalizeUnwrap` with proof releases the ERC-20). `useUnwrap` uses the verified 3.0.0 `useUnshield({ tokenAddress, wrapperAddress }).mutate({ amount })` single-call orchestration; ACL via `inputProof` (no operator step).
- **HONEST SUCCESS (UNW-02) test-locked:** `isUnwrapSuccess(stage)` is TRUE only at `finalized` — proven FALSE at requesting/decrypting/finalizing by RED→GREEN vitest. The UI Done state + success copy render only at `finalized`, and the underlying ERC-20 `balanceOf` is refetched to prove arrival (never optimistic).
- **Never-strand-funds:** pending-unshield persistence + `useResumeUnshield` recover a burned-but-unfinalized unwrap.
- **Loop closure (SC4):** Wrap/Unwrap toggle + PairCard Unwrap link make wrap→decrypt→unwrap continuous in-app.
- **Tests:** vitest 98/98 green (75 prior + 23 new). check-types 0, build 0 (`/unwrap` route emitted). No regression to Phases 1-4.

## Requirements Coverage

| Req | Status | Evidence |
|-----|--------|----------|
| UNW-01 | ✓ code / ⏳ live UAT | `useUnwrap` two-tx unwrap→finalize; /unwrap screen amount-from-decrypt + Unwrap-all; live "ERC-20 arrives" in 05-UAT.md |
| UNW-02 | ✓ code (test-locked) / ⏳ live UAT | `isUnwrapSuccess` only at `finalized` (unit-proven); honest 4-stage + ERC-20 balanceOf refetch; live pending→finalized in 05-UAT.md |

## Deferred (to 05-UAT.md — single end-of-project manual session)

Live two-tx relayer/finalize proof (wallet + gas + relayer on the deployed URL):
1. Unwrap → underlying ERC-20 balance increases after finalize (UNW-01, SC1).
2. Pending → finalized progression; success never before finalize (UNW-02, SC2).
3. Resume of an interrupted unwrap; finalize latency notes.
4. **Full loop:** wrap → decrypt → unwrap end-to-end for a just-wrapped token (SC4) — the headline proof.

## Verdict

Code + automated verification PASSED. The core wrap→decrypt→unwrap loop is code-complete; live full-loop UAT tracked for the end-of-project manual pass.
