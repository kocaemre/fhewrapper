---
phase: 6
slug: error-handling-status
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-08
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for the SYSTEMATIZATION phase. The correctness-critical PURE logic — the
> unified error classifier (`toAppError`, all SC1 failure modes -> `{chip, body, recoverable}`, no raw revert)
> and the Sepolia explorer-URL builder — is unit-tested (vitest, RED-first). The four existing per-flow maps
> keep their unchanged test suites as a regression guard proving the delegation preserves copy. The
> toast/explorer/stage WIRING and the honest async-wait presentation are SDK/wagmi/relayer/UI-owned ->
> INTEGRATION (check-types + build) in-phase, with the live "does each error mode surface + is the async wait
> reassuring on the deployed URL" proof deferred to a single end-of-project UAT session (time-box directive).
> NO new `@zama-fhe` SDK surface, NO package installs. Source: 06-CONTEXT.md.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.10 (installed, configured Phase 2/3) — no new dependency |
| **Config file** | `packages/nextjs/vitest.config.ts` |
| **Quick run command** | `cd packages/nextjs && npx vitest run <file>` |
| **Full suite command** | `cd packages/nextjs && npx vitest run` |
| **Type/build gates** | `npm run check-types` · `npm run build` |
| **Estimated runtime** | units <5s; `npm run build` ~60–90s; live error-surface + async-wait UX = manual on the Vercel URL |

---

## Sampling Rate

- **After every task commit:** `npx vitest run <changed .test.ts>` (appError + explorer) + `npm run check-types`.
- **After every plan wave:** full `npx vitest run` + `npm run build` (`/faucet` for 06-01; `/wrap` + `/unwrap` for 06-02).
- **Before `/gsd-verify-work`:** full unit suite green (98 prior locks + new appError/explorer units, unchanged) + `next build` clean + the deferred `06-UAT.md` live error-surface pass on the deployed URL.
- **Max feedback latency:** ~90s (units + build); live error-surface + reassurance UX is a manual gate (deferred to end-of-project UAT).

---

## Per-Requirement Verification Map

| Req ID | Behavior | Test Type | Automated Command | File Exists | Status |
|--------|----------|-----------|-------------------|-------------|--------|
| UX-01 | `toAppError` -> `{chip, body, recoverable}`; every SC1 mode (missing approval / insufficient balance / network mismatch / unsupported token / ACL denial / faucet edge) yields a non-empty body | unit (pure) | `npx vitest run lib/appError.test.ts` | ❌ W0 | ⬜ pending |
| UX-01 | No raw revert leaks — no SC1 body contains a raw-revert substring; unknown error -> safe generic body | unit (pure) | `npx vitest run lib/appError.test.ts -t "revert"` | ❌ W0 | ⬜ pending |
| UX-01 | Delegation parity — `toFaucetError`/`toWrapError`/`toUnwrapError`/`toDecryptError` resolve through `toAppError` (one model) | unit (pure) | `npx vitest run lib/appError.test.ts -t "delegat"` | ❌ W0 | ⬜ pending |
| UX-01 | Four per-flow maps keep their existing copy (regression guard on the delegation) | unit (pure) | `npx vitest run lib/faucetErrors.test.ts lib/wrapErrors.test.ts lib/unwrapErrors.test.ts lib/decryptErrors.test.ts` | ✅ (Phase 3-5) | ⬜ pending |
| UX-02 | `sepoliaTxUrl` pins `sepolia.etherscan.io/tx/<hash>`, rejects malformed hash -> undefined | unit (pure) | `npx vitest run lib/explorer.test.ts` | ❌ W0 | ⬜ pending |
| UX-02 | `txToast` (pending/success/error, one reused id) + `ExplorerTxLink` compile & build | integration (type/build) | `npm run check-types && npm run build` | ✅ (06-01 W2/W3) | ⬜ pending |
| UX-02 | Faucet claim shows stage view + toast + explorer link + typed error | integration (build) + manual | `npm run build` (`/faucet`) then live | ✅ (06-01) / ❌ manual | ⬜ pending |
| UX-02 | Wrap + unwrap show toasts + explorer links + unified error rows | integration (build) + manual | `npm run build` (`/wrap`,`/unwrap`) then live | ✅ (06-02) / ❌ manual | ⬜ pending |
| UX-03 | Unwrap decrypting/finalizing wait shows explicit reassuring copy (never a silent hang) | integration (build) + manual | `npm run build` then live | ✅ (06-02) / ❌ manual | ⬜ pending |
| UX-03 | Success toast/"arrived" gated to `finalized` only (no optimistic success — UNW-02 preserved) | integration (build) + manual | `npm run build` then live | ✅ (06-02) / ❌ manual | ⬜ pending |
| UX-01/02 | Each failure mode actually surfaces its typed message + toast + explorer link on the deployed URL | manual (live wallet/relayer) | manual on live URL | ❌ manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `lib/appError.ts` + `.test.ts` — the unified `toAppError` classifier (`{chip, body, recoverable}`; all SC1 modes; no raw-revert leak; delegation parity for all four flows) — RED-first (06-01 Task 1).
- [ ] `lib/explorer.ts` + `.test.ts` — `sepoliaTxUrl` host-pinned + malformed-hash-rejecting URL builder — RED-first (06-01 Task 1).

---

## Why not more automated coverage

The toast rendering, the explorer-link click-through, the faucet mint / wrap `useShield` / unwrap `useUnshield`
tx paths, and the gateway public-decryption wait are wallet-, gas-, and relayer-dependent — the SDK/wagmi/UI own
them and mocking would only test the mock. The correctness-critical claims (every failure mode maps to typed
human-readable copy with no raw revert; the explorer host is pinned) are captured PURELY in `appError.ts` /
`explorer.ts` and unit-locked, so UX-01 is provable in-phase. The remaining claims — that each error mode
visibly surfaces its toast/stage/link and that the async unwrap wait reads as reassuring — are inherently visual
+ live and are proven once on the deployed URL in `06-UAT.md`.
