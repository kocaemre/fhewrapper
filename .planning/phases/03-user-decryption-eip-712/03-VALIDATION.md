---
phase: 3
slug: user-decryption-eip-712
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-07
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> The @zama-fhe hooks own the relayer + EIP-712 path — they require the provider + a live relayer +
> a connected wallet, so hook-level decryption is INTEGRATION/MANUAL on the live URL (mocking the SDK
> would test the mock, not the requirement). The app-authored PURE logic (address validation, error
> mapping, decimals formatting, zero-handle) is unit-tested with vitest. Source: 03-RESEARCH.md ## Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.10 (+ @vitest/coverage-v8) — already installed (Phase 2), no new dependency |
| **Config file** | `packages/nextjs/vitest.config.ts` |
| **Quick run command** | `cd packages/nextjs && npx vitest run <file>` |
| **Full suite command** | `cd packages/nextjs && npx vitest run` |
| **Estimated runtime** | units <5s; `npm run build` ~60–90s (wave merge); live decrypt = manual on Vercel URL |

---

## Sampling Rate

- **After every task commit:** `npx vitest run <changed .test.ts>` (pure logic: address validation, error mapping, decimals format) + `npm run check-types`
- **After every plan wave:** full `npx vitest run` + `npm run build`
- **Before `/gsd-verify-work`:** full unit suite green + a REAL decrypt on the DEPLOYED Vercel URL (DEC-01..04 are relayer-dependent; unit tests alone cannot prove them) + `next build` clean
- **Max feedback latency:** ~90s for units; live decrypt is a manual gate

---

## Per-Requirement Verification Map

| Req ID | Behavior | Test Type | Automated Command | File Exists | Status |
|--------|----------|-----------|-------------------|-------------|--------|
| DEC-01 | Decrypt connected wallet's registry cToken balance → correct cleartext | integration / manual (live relayer + wallet) | manual on live URL | ❌ manual | ⬜ pending |
| DEC-02 | Decrypt an out-of-registry PASTED ERC-7984 (any token) | integration / manual | manual on live URL | ❌ manual | ⬜ pending |
| DEC-02 | Address validation: `isAddress` reject + ERC-165 non-confidential reject | unit (pure) | `npx vitest run lib/decryptValidate.test.ts` | ❌ W0 | ⬜ pending |
| DEC-03 | Permit reuse: ONE EIP-712 signature covers repeated decrypts within window | integration / manual | manual on live URL | ❌ manual | ⬜ pending |
| DEC-04 | No-ACL token → graceful "no access", never an infinite spinner | unit (error mapper) + manual | `npx vitest run lib/decryptErrors.test.ts` | ❌ W0 | ⬜ pending |
| DEC-04 | Zero handle → renders `0` (not an error) | unit (pure) | `npx vitest run lib/decryptErrors.test.ts` | ❌ W0 | ⬜ pending |
| — | Decimals-safe display: `formatUnits(bigint, decimals)` | unit | `npx vitest run lib/formatConfidential.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `lib/decryptValidate.ts` + `.test.ts` — pure `isAddress`/`getAddress` normalization + confidential-check gating (DEC-02 input) — RED-first
- [ ] `lib/decryptErrors.ts` + `.test.ts` — `ZamaError` subclass → UI reason-string mapping; zero-handle → `0` (DEC-04, by constructing the error/handle instances, no live relayer) — RED-first
- [ ] `lib/formatConfidential.ts` + `.test.ts` — `formatUnits(bigint, decimals)` display helper (RESEARCH Pitfall 5) — RED-first
- [ ] Manual UAT checklist for DEC-01/02/03/04 on the live Vercel URL (relayer-dependent behaviors)

*Hook-level decrypt is NOT unit-tested — the SDK owns the relayer/EIP-712 path. Cover app-authored pure logic in units; cover SDK integration via manual UAT on the live URL.*

---

## Manual-Only Verifications (live Vercel URL — relayer + wallet required)

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Decrypt a registry cToken balance → correct cleartext | DEC-01 | Live relayer + wallet + EIP-712 sig; not reproducible in CI | On https://fhewrapper-nextjs.vercel.app/, connect a Sepolia wallet, click Decrypt on a cToken you hold, sign the one-time permit, confirm the revealed cleartext matches the expected balance |
| Paste-an-address decrypt of a NON-registry ERC-7984 | DEC-02 | Same relayer dependency | On `/decrypt`, paste an ERC-7984 address outside the registry, decrypt, confirm the wallet's balance reveals (proves "any token") |
| Single reusable permit | DEC-03 | Signature reuse across tokens/window | After granting the permit once, decrypt a second token WITHOUT a new signature prompt (permit-active indicator shown) |
| Graceful no-ACL / zero-balance / bad-address | DEC-04 | Relayer/ACL runtime states | Trigger a no-ACL token + a zero-balance token + a non-ERC-7984 address; confirm each shows a clear state, never an infinite spinner. Record the concrete no-ACL error class (resolves RESEARCH Open Question 1) |

---

## Validation Sign-Off

- [ ] All app-authored pure logic has a vitest unit test; SDK/relayer behaviors have a Manual-Only entry above
- [ ] Sampling continuity: no 3 consecutive tasks without a vitest/check-types check
- [ ] Wave 0 covers the 3 pure-logic modules (validate/errors/format) RED-first
- [ ] No watch-mode flags (`vitest run`)
- [ ] Feedback latency < 90s (units); live decrypt is the phase gate
- [x] `nyquist_compliant: true` (validation substance in RESEARCH + 03-01 TDD tasks; decrypt correctness proven on the live URL)

**Approval:** pending
