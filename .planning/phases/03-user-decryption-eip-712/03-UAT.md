---
phase: 03-user-decryption-eip-712
type: manual-uat
status: pending
deferred: true
when: end-of-project (single manual session before final submission)
url: https://fhewrapper-nextjs.vercel.app/
requirements: [DEC-01, DEC-02, DEC-03, DEC-04]
resolves: "RESEARCH Open Question 1 (concrete no-ACL error class)"
---

# Phase 3 — Live-URL Decrypt Manual UAT (DEFERRED)

The EIP-712 user-decryption path is relayer-dependent and cannot be proven by unit
tests (RESEARCH Open Questions 1/3). These checks were **intentionally deferred** to
a single end-of-project manual session (time-boxed directive) — the CODE and all
automated gates for Phase 3 are already green (check-types, lint, vitest 55/55, build).

Run all checks on the LIVE deployed URL, **not** localhost — the real relayer under
COEP `require-corp` is the phase gate. Mark each `[ ]` → `[x]` and fill the results.

## Preconditions

- [ ] Latest commit deployed to https://fhewrapper-nextjs.vercel.app/ (Phase-1 GitHub→Vercel pipeline).
- [ ] Browser console shows `crossOriginIsolated === true` on load (isolation failures are silent until you decrypt).
- [ ] MetaMask connected on **Sepolia** via the existing ChainGuard/connect flow.
- [ ] Wallet holds ≥1 registry cToken (claim via the Zama faucet if needed).

## Checks

### DEC-01 — Registry cToken decrypt (correct cleartext)
- [ ] On a registry PairCard for a cToken you hold, click **Decrypt** → approve **ONE** EIP-712 signature.
- [ ] The blurred ciphertext reveals the correct cleartext balance (spot-check magnitude + decimals against what you hold).
- Result: _______________________________________________

### DEC-03 — Single reusable permit + VIEWING KEY ACTIVE
- [ ] Click **Decrypt** on a SECOND card → **no** second signature prompt (permit cached in-window).
- [ ] Open `/decrypt` → the `◈ VIEWING KEY ACTIVE` badge is shown for a covered token.
- Result: _______________________________________________

### DEC-02 — Paste-an-address + quick-picks (any token)
- [ ] On `/decrypt`, paste an **out-of-registry** ERC-7984 the wallet holds → **Sign & Decrypt** → cleartext reveals (no re-sign if permit cached — DEC-03 cross-path cache).
- [ ] Paste a non-ERC-7984 (plain ERC-20) → `NOT A CONFIDENTIAL (ERC-7984) TOKEN`.
- [ ] Paste garbage → `NOT A VALID ADDRESS`.
- [ ] Click a registry **quick-pick chip** → it fills the address and decrypts.
- Result: _______________________________________________

### DEC-04 — Graceful failure states (no hang)
- [ ] Paste an ERC-7984 the wallet has **NO ACL access** to → `NO DECRYPTION ACCESS` (graceful, no infinite spinner).
- [ ] A token with a zero/never-initialized balance → reveals `0 {symbol}` in the green DECRYPTED BALANCE state.
- **RECORD the concrete no-ACL error class** the relayer throws (resolves RESEARCH Open Q1).
  Hypothesis: `DecryptionFailedError` or `RelayerRequestFailedError` (both already mapped to `NO DECRYPTION ACCESS` in `lib/decryptErrors.toDecryptError`, alongside `matchAclRevert`).
- Observed no-ACL error class: _______________________________________________

### Cross-cutting — theme + reduced-motion
- [ ] Toggle parchment/cellar theme → colors follow.
- [ ] With OS reduced-motion on → blur→reveal shows final states without animation.
- Result: _______________________________________________

## Sign-off

- [ ] DEC-01, DEC-02, DEC-03, DEC-04 all pass on the live URL.
- [ ] RESEARCH Open Question 1 resolved (no-ACL error class recorded above) → update `03-RESEARCH.md`.
- Verified by: __________________  Date: __________
