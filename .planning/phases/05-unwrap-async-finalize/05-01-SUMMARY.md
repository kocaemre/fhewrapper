---
phase: 05-unwrap-async-finalize
plan: 01
subsystem: unwrap-engine
tags: [unwrap, useUnshield, useResumeUnshield, finalize, erc7984, honest-async, bigint, tdd, zama-sdk]

# Dependency graph
requires:
  - phase: 03-user-decryption-eip-712
    provides: "useConfidentialBalance decrypted balance (the plaintext confidential units unwrap validates against)"
  - phase: 04-faucet-wrap
    provides: "useWrap 4-stage machine + wrapErrors — the mirror-the-shape source for the unwrap engine"
provides:
  - "nextUnwrapStage(current, event) + isUnwrapSuccess(stage) — the honest UNW-02 stage reducer (success ONLY at finalized)"
  - "parseUnwrapAmount(whole, decimals, decryptedBalance) — decimals-driven amount validation (never hardcodes 18)"
  - "toUnwrapError(e) — ZamaError-subclass → readable copy map for the unwrap/finalize flow"
  - "browserPendingStorage + rememberPendingUnwrap/readPendingUnwrap/forgetPendingUnwrap — pending-unshield persistence (never-strand-funds)"
  - "useUnwrap(confidentialAddr) — useUnshield/useUnshieldAll honest machine + useResumeUnshield wiring + pending persistence"
affects: [05-02, 05-UAT, 07-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Unwrap = ONE hook (useUnshield { tokenAddress, wrapperAddress }); the two-tx burn→oracle-decrypt→finalize is auto-orchestrated, callbacks drive the honest stage machine — never hand-roll the two-tx flow"
    - "Success (finalized) is gated EXCLUSIVELY on the mutation resolve (finalize-tx receipt); onUnwrapSubmitted/onFinalizing/onFinalizeSubmitted are explicitly NOT success (UNW-02 no-optimistic-success)"
    - "Pending unwrap persisted on onUnwrapSubmitted, cleared only on finalize resolve, KEPT on error — a burned-but-unfinalized unwrap is recoverable via useResumeUnshield (never strand funds)"
    - "No setOperator/operator-approval step — the FHE inputProof grants the wrapper ACL for a self-unwrap"

key-files:
  created:
    - packages/nextjs/lib/unwrapStages.ts
    - packages/nextjs/lib/unwrapStages.test.ts
    - packages/nextjs/lib/unwrapAmount.ts
    - packages/nextjs/lib/unwrapAmount.test.ts
    - packages/nextjs/lib/unwrapErrors.ts
    - packages/nextjs/lib/unwrapErrors.test.ts
    - packages/nextjs/lib/pendingUnshield.ts
    - packages/nextjs/lib/pendingUnshield.test.ts
    - packages/nextjs/hooks/useUnwrap.ts
  modified: []

key-decisions:
  - "useUnshield config is { tokenAddress, wrapperAddress } (installed 3.0.0, verified on disk), both set to the confidential address (ERC7984ERC20Wrapper IS the confidential token) — mirrors useShield/A5"
  - "Pending persistence uses a thin GenericStorage localStorage shim (browserPendingStorage) rather than plumbing the provider IndexedDB store into a component — keeps the MVP thin while still using the verified SDK save/load/clear helpers"
  - "useUnwrap is type-gated (check-types), not unit-mocked — the SDK/wallet/relayer tx path is proven live in 05-UAT (mirrors 04-02 coverage D3)"
  - "resumePending() reads the persisted unwrapTxHash and drives useResumeUnshield — jumps straight to the oracle-wait (finalizing→decrypting) stage since the burn is already done"

patterns-established:
  - "Honest async stage reducer where success is a single terminal event (resolved), unit-locked as PURE logic — the earlier progress callbacks are explicitly NOT success"
  - "TDD RED→GREEN for the pure app-authored logic (stages/amount/errors/storage shim); the SDK hook wiring is check-types-gated only"

requirements-completed: [UNW-01, UNW-02]

coverage:
  - id: D1
    description: "nextUnwrapStage happy path + isUnwrapSuccess true ONLY at finalized; unwrap-submitted stays requesting; finalizing→decrypting; finalize-submitted→finalizing; error/reset"
    requirement: "UNW-02"
    verification:
      - kind: unit
        ref: "lib/unwrapStages.test.ts#nextUnwrapStage + isUnwrapSuccess (7 cases)"
        status: pass
    human_judgment: false
  - id: D2
    description: "parseUnwrapAmount decimals-driven (6-dp & 18-dp), never throws, exceedsBalance/belowMinimum flags, undefined-balance unwrap-all path"
    requirement: "UNW-01"
    verification:
      - kind: unit
        ref: "lib/unwrapAmount.test.ts#parseUnwrapAmount (5 cases)"
        status: pass
    human_judgment: false
  - id: D3
    description: "toUnwrapError maps each unwrap-flow ZamaError subclass (SigningRejected/InsufficientConfidential/RelayerRequestFailed/TransactionReverted/generic/unknown) to distinct readable copy"
    requirement: "UNW-01"
    verification:
      - kind: unit
        ref: "lib/unwrapErrors.test.ts#toUnwrapError (7 cases)"
        status: pass
    human_judgment: false
  - id: D4
    description: "browserPendingStorage GenericStorage shim round-trips (set→get→delete→get null), JSON-serializes Hex, degrades safely without localStorage (in-memory fallback)"
    requirement: "UNW-02"
    verification:
      - kind: unit
        ref: "lib/pendingUnshield.test.ts#browserPendingStorage (4 cases)"
        status: pass
    human_judgment: false
  - id: D5
    description: "useUnwrap engine: useUnshield/useUnshieldAll honest machine + useResumeUnshield wiring + pending persistence; no setOperator/useFinalizeUnwrap"
    requirement: "UNW-01"
    verification:
      - kind: unit
        ref: "npm run check-types (tsc --noEmit) — only verified installed 3.0.0 symbols"
        status: pass
    human_judgment: true
    rationale: "The two-tx burn→oracle-decrypt→finalize path is SDK/wallet/relayer-owned; live honest-stage progression + ERC-20-arrives proof deferred to 05-UAT, not unit-mockable."

# Metrics
duration: 6min
completed: 2026-07-08
status: complete
---

# Phase 5 Plan 01: Honest unwrap engine (stages + amount + errors + pending + useUnwrap) Summary

**The UNW-02 no-optimistic-success engine: a PURE, unit-locked honest stage reducer that reports success ONLY at `finalized` (the finalize-tx receipt), plus decimals-driven amount validation, an unwrap error map, never-strand-funds pending persistence, and the `useUnwrap` hook wrapping the installed 3.0.0 `useUnshield`/`useUnshieldAll` + `useResumeUnshield` into that machine — with NO operator-approval step.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-08T06:12:32Z
- **Completed:** 2026-07-08T06:18:39Z
- **Tasks:** 3 (Tasks 1 & 2 were TDD: RED → GREEN)
- **Files modified:** 9 (9 created)

## Accomplishments
- Test-locked the UNW-02 heart: `nextUnwrapStage` advances `idle → requesting → decrypting → finalizing → finalized` and `isUnwrapSuccess` is TRUE only at `finalized` — `unwrap-submitted` (burn sent), `finalizing` (oracle wait), and `finalize-submitted` (finalize in flight) are all explicitly NOT success (12 vitest cases, RED→GREEN).
- `parseUnwrapAmount` is decimals-driven via viem `parseUnits` (6-dp AND 18-dp proven, never hardcodes 18), never throws, and flags `exceedsBalance`/`belowMinimum`; the unwrap-all path (undefined decrypted balance) does not flag `exceedsBalance` (UNW-01).
- `toUnwrapError` maps every unwrap/finalize-flow `ZamaError` subclass to distinct readable copy via `instanceof` in specific→generic order (no raw revert leak; UNW-01).
- `browserPendingStorage` is a `GenericStorage` localStorage shim with an in-memory `Map` fallback that degrades safely under SSR/node (no `window`), JSON-serializing values; `rememberPendingUnwrap`/`readPendingUnwrap`/`forgetPendingUnwrap` wrap the verified SDK `savePendingUnshield`/`loadPendingUnshield`/`clearPendingUnshield` helpers (never strand funds; Pitfall 3).
- `useUnwrap(confidentialAddr)` wraps the installed 3.0.0 `useUnshield`/`useUnshieldAll` into the honest machine, persisting pending on `onUnwrapSubmitted` and clearing only on finalize resolve (kept on error), with `useResumeUnshield` wiring (`resumePending()`) so an interrupted burn can be finalized. No `setOperator`/operator-approval step and no manual `useFinalizeUnwrap` path.

## Task Commits

Each task was committed atomically:

1. **Task 1 (TDD RED): failing tests for stages + amount + errors** - `b4cfe51` (test)
2. **Task 1 (TDD GREEN): stages reducer + amount validation + error map** - `dc117c3` (feat)
3. **Task 2 (TDD RED): failing test for pending storage shim** - `e4de6a7` (test)
4. **Task 2 (TDD GREEN): pending-unshield storage shim + wrappers** - `ee66f6a` (feat)
5. **Task 3: useUnwrap engine (useUnshield + resume + pending persist)** - `9fee278` (feat)

## Files Created/Modified
- `packages/nextjs/lib/unwrapStages.ts` — pure `nextUnwrapStage` reducer + `isUnwrapSuccess` (UNW-02)
- `packages/nextjs/lib/unwrapStages.test.ts` — 12-case honest-success lock
- `packages/nextjs/lib/unwrapAmount.ts` — decimals-driven `parseUnwrapAmount` (UNW-01)
- `packages/nextjs/lib/unwrapAmount.test.ts` — 5-case validation lock (6-dp & 18-dp)
- `packages/nextjs/lib/unwrapErrors.ts` — `toUnwrapError` instanceof-based map (UNW-01)
- `packages/nextjs/lib/unwrapErrors.test.ts` — 7-case error-copy lock
- `packages/nextjs/lib/pendingUnshield.ts` — `browserPendingStorage` shim + save/load/clear wrappers
- `packages/nextjs/lib/pendingUnshield.test.ts` — 4-case shim round-trip lock
- `packages/nextjs/hooks/useUnwrap.ts` — useUnshield/useUnshieldAll honest machine + useResumeUnshield wiring

## Decisions Made
- **useUnshield config shape `{ tokenAddress, wrapperAddress }`** (installed 3.0.0, verified on disk), both the confidential address since the ERC7984ERC20Wrapper IS the confidential token (mirrors 04-02 useShield A5).
- **Pending persistence via a thin `GenericStorage` localStorage shim** rather than plumbing the provider's IndexedDB store into a component — keeps the MVP thin while still using the verified SDK helpers. The node-env vitest suite doubles as proof of the safe in-memory fallback.
- **`useUnwrap` is type-gated, not unit-mocked** — the SDK/wallet/relayer two-tx path is proven live in 05-UAT (mirrors 04-02 coverage D3); `check-types` proves only verified installed 3.0.0 symbols (`useUnshield`/`useUnshieldAll`/`useResumeUnshield` + persistence + reducer) are referenced.
- **`resumePending()` jumps to the `finalizing` event (→ `decrypting`)** since the burn is already on-chain — it drives `useResumeUnshield({ unwrapTxHash })` from the persisted hash.

## Deviations from Plan

None - plan executed exactly as written. (`InsufficientConfidentialBalanceError` requires a `details` object as its second constructor arg — verified on disk before writing the error test, so the GREEN construction type-checks. Not a scope deviation.)

## Issues Encountered
- None. RED failed as expected (missing modules), GREEN passed on first run for all three suites; `check-types`, full vitest (98/98), and `next build` all green on the first attempt.

## User Setup Required
None - no external service configuration and zero new dependencies (Phase 5 installs nothing; every symbol ships in the already-audited installed `@zama-fhe/react-sdk@3.0.0` / `@zama-fhe/sdk@3.0.0`). Live two-tx unwrap→finalize→ERC-20-arrives verification is deferred to `05-UAT.md`.

## Next Phase Readiness
- The honest unwrap engine (reducer + amount + errors + pending + `useUnwrap`) is complete and type-safe; 05-02 can build the unwrap UI panel + stage indicator + route on top of `useUnwrap`, reusing the Phase-3 decrypt surface for the amount ceiling.
- No regression: full vitest 98/98 (75 prior + 23 new), `check-types` exit 0, `next build` exit 0 (all routes emitted).

## Known Stubs
None — every export is fully wired; no placeholder/empty-value data paths introduced.

## Self-Check: PASSED

All 9 created files present on disk; all 5 task commits (`b4cfe51`, `dc117c3`, `e4de6a7`, `ee66f6a`, `9fee278`) present in git history. Gates: vitest 98/98, `check-types` exit 0, `next build` exit 0.

---
*Phase: 05-unwrap-async-finalize*
*Completed: 2026-07-08*
