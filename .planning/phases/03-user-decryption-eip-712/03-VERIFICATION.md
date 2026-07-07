---
phase: 03-user-decryption-eip-712
verified: 2026-07-07
status: passed
score: automated gates + plan-checker green; live relayer decrypt deferred to 03-UAT.md
human_verified: deferred
human_verified_note: "Per user directive (time-boxed / floor-it): the live-URL relayer decrypt proofs (DEC-01/02/03/04 end-to-end) are deferred to a single end-of-project manual UAT session, captured in 03-UAT.md. Code + automated verification passed now."
---

# Phase 3: User-Decryption (EIP-712) — Verification Report

**Phase Goal:** A connected wallet can decrypt its confidential ERC-7984 balance via a correct EIP-712 user-decryption flow — for registry cTokens AND any pasted ERC-7984 — and see the correct cleartext.
**Status:** passed (automated) · live relayer decrypt deferred to 03-UAT.md
**Verified:** 2026-07-07 (orchestrator-level, per floor-it directive — per-phase verifier agent skipped; upstream plan-checker + automated gates relied upon)

## Automated verification (passed)

- **Hook correctness (the phase's central risk):** the plan-checker verified every @zama-fhe symbol against the INSTALLED 3.0.0 `.d.ts` — only real 3.0.0 hooks used (`useAllow`/`useIsAllowed`/`useConfidentialBalance`/`useIsConfidential`/`useUserDecrypt`/`useMetadata`); the non-existent `useGrantPermit`/`useHasPermit`/`useDecryptValues` are absent (forbidden-hook scan clean across all phase commits).
- **Tests:** vitest 55/55 green (7 files) — pure logic RED-first then GREEN: error taxonomy (`toDecryptError`), decimals formatting (`formatConfidential`), address validation (`validateDecryptTarget`).
- **Build/types:** `npm run check-types` exit 0, `npm run build` exit 0 (orchestrator-reconfirmed), `/decrypt` static route emitted.
- **No regression:** Phase-1 provider tree / crossOriginIsolated / COOP-COEP untouched (no install/config change — provider already wired); Phase-2 registry browse stays UN-gated (PairCardDecrypt self-gates); themed connect button + readable dropdown intact.

## Requirements Coverage

| Req | Status | Evidence |
|-----|--------|----------|
| DEC-01 | ✓ code / ⏳ live UAT | `useUserDecrypt` + `useConfidentialBalance` per-card blur→reveal; live cleartext proof in 03-UAT.md |
| DEC-02 | ✓ code / ⏳ live UAT | `validateDecryptTarget` + `useIsConfidential` ERC-165 + paste-an-address `DecryptPanel` + registry quick-picks |
| DEC-03 | ✓ code / ⏳ live UAT | single `useAllow` non-token permit + `useIsAllowed` VIEWING KEY ACTIVE indicator |
| DEC-04 | ✓ code | `toDecryptError` taxonomy (ZamaError subclasses + matchAclRevert), `isZeroHandle`→0, 4-stage machine (never hangs) |

## Deferred (to 03-UAT.md — single end-of-project manual session)

The relayer-dependent decrypt proofs cannot be validated by unit tests — they need a connected Sepolia wallet + live relayer under require-corp on the deployed URL:
1. Decrypt a registry cToken balance → correct cleartext (DEC-01).
2. Paste a non-registry ERC-7984 → decrypt without re-signing (DEC-02/03).
3. No-ACL + zero-balance + bad-address → graceful states; record the concrete no-ACL error class (RESEARCH Open Q1).

## Verdict

Code + automated verification PASSED. Phase advances; live decrypt UAT tracked for the end-of-project manual pass.
