---
phase: 04-faucet-wrap
plan: 02
subsystem: ui
tags: [wrap, useShield, erc7984, erc20-wrapper, previewWrap, bigint, wagmi, viem, tdd, next-app-router]

# Dependency graph
requires:
  - phase: 02-registry-browse
    provides: "useRegistryPairs, RegistryPair type, PairCard, TokenIcon, normalizeSymbol, formatConfidentialAmount"
  - phase: 03-user-decryption-eip-712
    provides: "useUserDecrypt / useConfidentialBalance / PairCardDecrypt (the decrypt==preview correctness proof)"
  - phase: 01-foundation-deploy-spike
    provides: "ChainGuard (Sepolia gate), FHE provider tree, COOP/COEP headers"
provides:
  - "previewWrap(underlyingRaw, rate, wrapperDecimals) — pure bigint wrap-preview math (floor, refund, belowOneUnit)"
  - "toWrapError(e) — ZamaError-subclass → readable copy map"
  - "useWrap(confidentialAddr) — useShield 4-stage machine + onchain rate() read + preview helper"
  - "WrapPanel + WrapStageIndicator + /wrap route — functional wrap screen with decrypt==preview proof"
  - "PairCard Wrap → CTA now links /wrap?token=<confidential> (was inert)"
affects: [05-unwrap, 07-polish, 04-UAT]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wrap = ONE hook (useShield { tokenAddress, wrapperAddress }); approve+wrap auto-orchestrated, callbacks drive the 4-stage indicator — never hand-roll approve+wrap"
    - "Preview math is PURE bigint (floor(underlyingRaw/rate)); rate() + per-side decimals read onchain per pair — never hardcode 18"
    - "useSearchParams route (/wrap) resolves the pair against the trusted onchain registry, wrapped in Suspense + ChainGuard"

key-files:
  created:
    - packages/nextjs/lib/previewWrap.ts
    - packages/nextjs/lib/previewWrap.test.ts
    - packages/nextjs/lib/wrapErrors.ts
    - packages/nextjs/lib/wrapErrors.test.ts
    - packages/nextjs/hooks/useWrap.ts
    - packages/nextjs/components/wrap/WrapPanel.tsx
    - packages/nextjs/components/wrap/WrapStageIndicator.tsx
    - packages/nextjs/app/wrap/page.tsx
  modified:
    - packages/nextjs/components/registry/PairCard.tsx
    - .planning/phases/04-faucet-wrap/04-UAT.md

key-decisions:
  - "useShield config is { tokenAddress, wrapperAddress } (installed 3.0.0), NOT the docs' { address }; both set to the confidential address (ERC7984ERC20Wrapper IS the confidential token)"
  - "approvalStrategy defaults to 'max' for a smoother repeat-demo (04-RESEARCH Open Q2)"
  - "rateContract(addr) from @zama-fhe/sdk returns a full { address, abi, functionName:'rate', args:[] } read-config — spreads cleanly into useReadContract (no local ABI needed)"
  - "previewWrap's wrapperDecimals param is display-only (math is decimals-agnostic); kept in the signature per WRP-02 with an inline eslint-disable"

patterns-established:
  - "4-stage wrap indicator (approve/wrap/confirm/done) driven off useShield onApprovalSubmitted/onShieldSubmitted + mutation resolve (receipt)"
  - "TDD RED→GREEN for the pure app-authored logic; the SDK/wagmi tx path is proven live in 04-UAT, not unit-mocked"

requirements-completed: [WRP-01, WRP-02]

coverage:
  - id: D1
    description: "previewWrap pure math: floor(underlyingRaw/rate), consumed/refund, belowOneUnit; 6-dp (rate=1) & 18-dp (rate=1e12) '1 whole → 1.0' invariant"
    requirement: "WRP-02"
    verification:
      - kind: unit
        ref: "lib/previewWrap.test.ts#previewWrap (5 cases)"
        status: pass
    human_judgment: false
  - id: D2
    description: "toWrapError maps every wrap-flow ZamaError subclass (SigningRejected/InsufficientERC20/ApprovalFailed/TransactionReverted/generic/unknown) to readable copy"
    requirement: "WRP-01"
    verification:
      - kind: unit
        ref: "lib/wrapErrors.test.ts#toWrapError (6 cases)"
        status: pass
    human_judgment: false
  - id: D3
    description: "useWrap engine: useShield { tokenAddress, wrapperAddress } 4-stage machine + onchain rate() read + guarded preview helper"
    requirement: "WRP-01"
    verification:
      - kind: unit
        ref: "npm run check-types (tsc --noEmit) — only verified installed 3.0.0 symbols"
        status: pass
    human_judgment: true
    rationale: "The approve→wrap tx path is SDK/wagmi-owned and wallet/gas/relayer-dependent; live 4-stage progression proven in 04-UAT (WRP-01), not unit-mockable."
  - id: D4
    description: "/wrap screen: From-ERC-20 (balance+Max) / To-ERC-7984 preview, below-one-unit disable, error row, on-done decrypt==preview proof; PairCard Wrap → CTA wired"
    requirement: "WRP-02"
    verification:
      - kind: integration
        ref: "npm run build — /wrap route emitted (6.02 kB), static, 75/75 vitest green"
        status: pass
    human_judgment: true
    rationale: "The decrypt==preview correctness proof (top judging axis) requires a live wallet wrap + relayer decrypt on the deployed URL; deferred to 04-UAT WRP-01/02, cannot be unit-proven."

# Metrics
duration: 9min
completed: 2026-07-08
status: complete
---

# Phase 4 Plan 02: Wrap slice (previewWrap + useShield 4-stage + decrypt==preview) Summary

**Functional `/wrap` screen: onchain-accurate `previewWrap` bigint math (floor(underlyingRaw/rate), never hardcodes 18) + a single `useShield` approve→wrap flow driving a 4-stage indicator + the Phase-3 decrypt surface for the decrypt==preview correctness proof (WRP-01/WRP-02).**

## Performance

- **Duration:** 9 min
- **Started:** 2026-07-08T05:39:17Z
- **Completed:** 2026-07-08T05:48:03Z
- **Tasks:** 3 (Task 1 was TDD: RED → GREEN)
- **Files modified:** 10 (8 created, 2 modified)

## Accomplishments
- Test-locked the WRP-02 core: `previewWrap` proves the "1 whole underlying → 1.0 confidential" invariant for BOTH a 6-dp (cUSDC, rate=1) and an 18-dp (cWETH, rate=1e12) pair, plus floor rounding, below-one-unit, and remainder refund (11 new vitest cases, RED→GREEN).
- `toWrapError` maps every wrap-flow `ZamaError` subclass to readable copy via `instanceof` (no raw revert leak; WRP-01 messaging).
- `useWrap` wraps the installed 3.0.0 `useShield({ tokenAddress, wrapperAddress })` into the design's 4-stage machine (approve/wrap/confirm/done) off `onApprovalSubmitted`/`onShieldSubmitted`/receipt, reads `rate()` onchain via `rateContract`, and exposes a guarded pure preview helper — no hand-rolled approve+wrap.
- Built the `/wrap` screen (From-ERC-20 with balance+Max, To-ERC-7984 preview, below-one-unit disable, typed error row, 4-stage indicator) under `ChainGuard`, resolving the pair from the trusted registry by `?token=`; on `done` it renders the Phase-3 `PairCardDecrypt` so decrypt==preview can be confirmed.
- Wired the previously-inert PairCard `Wrap →` CTA to `/wrap?token=<confidential>`.

## Task Commits

Each task was committed atomically:

1. **Task 1 (TDD RED): failing tests for previewWrap + wrapErrors** - `12e033e` (test)
2. **Task 1 (TDD GREEN): previewWrap math + wrap error map** - `400e0f8` (feat)
3. **Task 2: useWrap engine (useShield + rate read + preview + 4-stage)** - `11eec75` (feat)
4. **Task 3: wrap screen — WrapPanel + stage indicator + /wrap route + wired PairCard CTA** - `ec89d08` (feat)

## Files Created/Modified
- `packages/nextjs/lib/previewWrap.ts` - PURE bigint `previewWrap(underlyingRaw, rate, wrapperDecimals)` → `{ confRaw, consumedRaw, refundRaw, belowOneUnit }` (WRP-02)
- `packages/nextjs/lib/previewWrap.test.ts` - 5-case unit lock (6-dp & 18-dp invariant, below-one-unit, refund, zero)
- `packages/nextjs/lib/wrapErrors.ts` - `toWrapError(e)` instanceof-based ZamaError → copy map (WRP-01)
- `packages/nextjs/lib/wrapErrors.test.ts` - 6-case unit lock for the error map
- `packages/nextjs/hooks/useWrap.ts` - useShield 4-stage machine + `rateContract` read + guarded preview
- `packages/nextjs/components/wrap/WrapPanel.tsx` - From/To panel, preview, warning/disable, stage indicator, error row, on-done decrypt proof
- `packages/nextjs/components/wrap/WrapStageIndicator.tsx` - 4-stage approve/wrap/confirm/done visual (✓/pulse/muted)
- `packages/nextjs/app/wrap/page.tsx` - `/wrap` route: `?token=` → trusted registry pair, Suspense + ChainGuard
- `packages/nextjs/components/registry/PairCard.tsx` - Wrap → CTA now a Link to `/wrap?token=` (functional)
- `.planning/phases/04-faucet-wrap/04-UAT.md` - appended 04-02 readiness note (wrap surface live in-repo; live proof pending)

## Decisions Made
- **useShield config shape:** `{ tokenAddress, wrapperAddress }` (installed 3.0.0, verified on disk) — NOT the docs' `{ address }`. Both fields are the confidential address since the ERC7984ERC20Wrapper IS the confidential token (04-RESEARCH A5/Pitfall 4).
- **approvalStrategy default `"max"`** for a smoother repeat demo (04-RESEARCH Open Q2); overridable per call.
- **`rateContract(addr)` used directly** — the SDK helper returns a complete `{ address, abi, functionName:"rate", args:[] }` read-config that spreads cleanly into `useReadContract`, so no local `rate()` ABI or edit to `registry/abis.ts` (owned by 04-01) was needed. Read pinned to Sepolia like the registry reads.

## Deviations from Plan

None - plan executed exactly as written. (One pre-commit-hook interaction: the eslint `no-unused-vars` rule rejected the display-only `wrapperDecimals` param — resolved with an inline `eslint-disable` while keeping the WRP-02 3-arg signature. Not a scope deviation.)

## Issues Encountered
- The repo pre-commit hook (lint-staged → eslint --fix) initially reverted the GREEN commit because `wrapperDecimals` was flagged unused (no `argsIgnorePattern` for `_` in eslint.config.mjs). Fixed with an inline `eslint-disable-next-line @typescript-eslint/no-unused-vars`; re-committed clean.
- `useSearchParams` on `/wrap` requires a Suspense boundary under Next 15 prerender — added `<Suspense>` around the resolver; build emits `/wrap` as static.

## User Setup Required
None - no external service configuration required. (Live wrap + decrypt==preview verification is deferred to `04-UAT.md` WRP-01/02, to be run once on the deployed URL.)

## Next Phase Readiness
- Wrap direction is complete and functional; Phase 5 (Unwrap) can add the `useUnshield`/`useUnshieldAll` flow behind the disabled "Unwrap" tab affordance already present in `WrapPanel`.
- `useWrap` amount is assumed UNDERLYING-raw base units; the live 18-dp cWETH decrypt==preview check in 04-UAT confirms the scale (04-RESEARCH Open Q1/A2).
- No regression: full vitest 75/75, check-types, and `next build` all green.

## Self-Check: PASSED

All 8 created files present on disk; all 4 task commits (`12e033e`, `400e0f8`, `11eec75`, `ec89d08`) present in git history. Gates: vitest 75/75, `check-types` exit 0, `next build` exit 0 (`/wrap` emitted).

---
*Phase: 04-faucet-wrap*
*Completed: 2026-07-08*
