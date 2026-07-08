---
phase: 07-polish-animation-submission
plan: 03
subsystem: hooks-public-api
tags: [dif-05, dif-03, dif-04, hooks-barrel, code-quality, decrypt-reveal, registry-polish]
requires: [useRegistryPairs, useWrap, useUnwrap, useUserDecrypt, useFaucet, DecryptStateBox, PairCard, RegistryToolbar]
provides: [hooks/index.ts public barrel, useRegistry alias]
affects: [packages/nextjs/hooks]
tech-stack:
  added: []
  patterns: [re-export barrel, type-only re-exports under isolatedModules]
key-files:
  created:
    - packages/nextjs/hooks/index.ts
  modified: []
decisions:
  - "DIF-03 and DIF-04 were verify-only: the blur-to-reveal and registry search/filter/badges/copy were already present and polished from Phases 2-3, so no rework was warranted (the plan's verify-and-tighten mandate)."
  - "Added UnwrapStage to the barrel's type re-exports (from ~~/lib/unwrapStages) for a symmetric public API — WrapStage/DecryptStage are already exported by their hooks, so exposing UnwrapStage keeps the return-type surface complete."
metrics:
  duration: ~8m
  completed: 2026-07-08
status: complete
---

# Phase 07 Plan 03: Public Hooks API Barrel + Decrypt/Registry Polish Verify Summary

Exposed a clean, well-typed public hooks surface via a single `hooks/index.ts` re-export barrel (DIF-05), and verified the DIF-03 decrypt blur-to-reveal and DIF-04 registry search/filter/badges/copy affordances are present and polished — no rework needed.

## What Was Built

### Task 1 — Public hooks API barrel (DIF-05) — commit `48d8ce7`
Created `packages/nextjs/hooks/index.ts` as the deliberate public API surface:
- Re-exports `useRegistryPairs` and its `useRegistry` alias (matching the requirement's naming), `useWrap`, `useUnwrap`, `useUserDecrypt`, and `useFaucet`.
- Re-exports the associated types: `UseRegistryPairsResult`; `UseWrapResult`, `WrapStage`, `ApprovalStrategy`; `UseUnwrapResult` (plus `UnwrapStage` from `~~/lib/unwrapStages` for completeness); `UseUserDecryptResult`, `UseUserDecryptOptions`, `DecryptStage`.
- Uses `export { ... } from` / `export type { ... } from` so the alias and type-only re-exports stay clean under `isolatedModules`.
- Top-of-file JSDoc documents the public API and each hook's contract (return shape + onchain state read/written).
- Re-export barrel only — no hook signature changed, no file moved. `check-types` resolves every symbol (T-07-07).

### Task 2 — Verify DIF-03 reveal + DIF-04 registry polish (no code change)
Verified present and polished; no tightening warranted:
- **DIF-03 blur-to-reveal**: `DecryptStateBox` (the `/decrypt` panel) and `PairCardDecrypt` (registry per-card decrypt) both render the `.cipher-blur` blurred ciphertext transitioning to the `.reveal-num` cleartext. `globals.css` drives it via the `revealNum` keyframe (blur(12px)/opacity 0.3 → blur(0)/opacity 1 over 0.9s, cubic-bezier ease) with a `prefers-reduced-motion: reduce` fallback that drops the animation while keeping the functional blur. Already smooth — left as-is.
- **DIF-04 registry polish**: `PairCard` wires `PairBadge` (valid/revoked) and `AddressCopyButton` (both sides); `RegistryToolbar` exposes search + valid/revoked filter chips. All confirmed present.

## Deviations from Plan

None — plan executed as written. Task 2 was intentionally verify-only per the plan's verify-and-tighten mandate; since DIF-03/DIF-04 were already delivered and polished in Phases 2-3, no files were modified and there was nothing to commit for Task 2.

## Verification

- `npm run check-types` — clean (barrel resolves every re-exported hook + type; DIF-05).
- Grep gates — barrel exports useRegistry/useWrap/useUnwrap/useUserDecrypt; `DecryptStateBox` keeps `cipher-blur` + `reveal-num`; `PairCard` wires `PairBadge` + `AddressCopyButton`; `RegistryToolbar` has search. All pass.
- `npx vitest run` — **130 passed / 0 failed** (no regression to cinematic/audio/prior phases).
- `npm run build` — exit 0 (compiled). The `@metamask/sdk` → `@react-native-async-storage/async-storage` "Module not found" warning is a pre-existing, out-of-scope transitive optional-dep warning unrelated to this plan (logged as out-of-scope, not fixed per scope boundary).
- No new `@zama-fhe` SDK or any dependency added.

## Known Stubs

None.

## Deferred to 07-UAT (live URL)

- The blur-to-reveal reads smoothly on a real decrypt.
- Search/filter/badges/copy behave on the deployed registry.

## Self-Check: PASSED
- FOUND: `packages/nextjs/hooks/index.ts`
- FOUND commit: `48d8ce7` (feat(07-03): add typed public hooks API barrel)
