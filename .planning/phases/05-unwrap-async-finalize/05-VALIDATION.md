---
phase: 5
slug: unwrap-async-finalize
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-08
---

# Phase 5 — Validation Strategy

> Per-phase validation contract. The honest unwrap STAGE MACHINE (no optimistic success — UNW-02), the
> amount validation (UNW-01), the error taxonomy, and the pending-persistence shim are the correctness-critical
> PURE logic → unit-tested (vitest). The `useUnshield` two-tx unwrap→finalize, the KMS/relayer public
> decryption, and the wrap→decrypt→unwrap loop are SDK/wagmi/relayer-owned → INTEGRATION/MANUAL on the live
> URL (mocking would test the mock). Floor-it: live proofs deferred to a single end-of-project UAT session.
> Source: 05-RESEARCH.md ## Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.10 (installed, configured Phase 2/3) — no new dependency |
| **Config file** | `packages/nextjs/vitest.config.ts` |
| **Quick run command** | `cd packages/nextjs && npx vitest run <file>` |
| **Full suite command** | `cd packages/nextjs && npx vitest run` |
| **Estimated runtime** | units <5s; `npm run build` ~60–90s (wave merge); live unwrap/finalize/loop = manual on Vercel URL |

---

## Sampling Rate

- **After every task commit:** `npx vitest run <changed .test.ts>` (stages + amount + errors + pending shim) + `npm run check-types`
- **After every plan wave:** full `npx vitest run` + `npm run build` (`/unwrap` route emitted)
- **Before `/gsd-verify-work`:** full unit suite green + a REAL wrap→decrypt→unwrap→ERC-20-arrives loop on the deployed URL (SC1-4) + `next build` clean
- **Max feedback latency:** ~90s (units); live loop proof is a manual gate (deferred to end-of-project UAT)

---

## Per-Requirement Verification Map

| Req ID | Behavior | Test Type | Automated Command | File Exists | Status |
|--------|----------|-----------|-------------------|-------------|--------|
| UNW-02 | Honest stage reducer: `isUnwrapSuccess` true ONLY at `finalized`; submit/decrypt/finalize are NOT success | unit (pure) | `npx vitest run lib/unwrapStages.test.ts` | ❌ W0 | ⬜ pending |
| UNW-02 | `finalizing` → `decrypting` (explicit oracle-wait step); `error` from any stage → `error` | unit (pure) | `npx vitest run lib/unwrapStages.test.ts -t "honest"` | ❌ W0 | ⬜ pending |
| UNW-01 | `parseUnwrapAmount` decimals-driven (6-dp & 18-dp), `≤ decryptedBalance`, rejects 0/neg/NaN | unit (pure) | `npx vitest run lib/unwrapAmount.test.ts` | ❌ W0 | ⬜ pending |
| UNW-01 | Unwrap error map (rejected/insufficient-confidential/reverted/relayer/generic) → readable copy | unit (pure) | `npx vitest run lib/unwrapErrors.test.ts` | ❌ W0 | ⬜ pending |
| UNW-02 | Pending-unshield shim round-trips (set→get→delete→null), tolerates unavailable localStorage | unit (pure) | `npx vitest run lib/pendingUnshield.test.ts` | ❌ W0 | ⬜ pending |
| UNW-01 | `useUnwrap` uses `useUnshield` (no operator step); only verified 3.0.0 symbols compile | integration (typecheck) | `npm run check-types` | ✅ (Wave 1) | ⬜ pending |
| UNW-01 | `/unwrap` route reachable under ChainGuard; Wrap/Unwrap toggle + PairCard link the loop | integration (build) | `npm run build` | ✅ (Wave 2) | ⬜ pending |
| UNW-01 | Encrypted-input unwrap → underlying ERC-20 balance actually increases after finalize | integration / manual (live + gas + relayer) | manual on live URL | ❌ manual | ⬜ pending |
| UNW-02 | Success shown ONLY after `finalizeUnwrap` completion / ERC-20 Transfer (no optimistic success) | integration / manual | manual on live URL | ❌ manual | ⬜ pending |
| SC3 | Unwrap grants wrapper ACL via inputProof (no operator) and does NOT revert | integration / manual | manual on live URL | ❌ manual | ⬜ pending |
| SC4 | Full wrap → decrypt → unwrap loop completes end-to-end for a just-wrapped token | integration / manual | manual on live URL | ❌ manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `lib/unwrapStages.ts` + `.test.ts` — honest reducer `nextUnwrapStage` + `isUnwrapSuccess` (success ONLY at `finalized`; the UNW-02 heart) — RED-first
- [ ] `lib/unwrapAmount.ts` + `.test.ts` — `parseUnwrapAmount` decimals-driven, `≤ decryptedBalance`, no-throw on bad input, 6-dp & 18-dp fixtures (UNW-01) — RED-first
- [ ] `lib/unwrapErrors.ts` + `.test.ts` — `toUnwrapError` ZamaError subclass → copy (mirror wrapErrors) — RED-first
- [ ] `lib/pendingUnshield.ts` + `.test.ts` — GenericStorage shim round-trip + save/load/clear wrappers (never-strand-funds) — RED-first

---

## Why not more automated coverage

The `useUnshield` two-tx orchestration, the KMS/relayer public decryption of the burn handle, the finalize
proof verification, and the ERC-20 arrival are wallet-, gas-, and relayer-dependent — the SDK/wagmi own that
path and mocking it would only test the mock (the exact anti-pattern 05-RESEARCH Don't-Hand-Roll warns against).
The honest-success guarantee (UNW-02) is instead captured PURELY in `unwrapStages.ts` and unit-locked, so the
correctness claim is provable in-phase; the live two-tx loop is proven once on the deployed URL in 05-UAT.md.
