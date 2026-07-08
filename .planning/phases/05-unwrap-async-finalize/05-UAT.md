---
phase: 05-unwrap-async-finalize
type: manual-uat
status: pending
deferred: true
when: end-of-project (single manual session before final submission)
url: https://fhewrapper-nextjs.vercel.app/
requirements: [UNW-01, UNW-02]
resolves: "RESEARCH Open Q1 (Sepolia finalize latency + resume frequency) + A3 (partial useUnshield amount scale)"
---

# Phase 5 — Live-URL Unwrap + Full-Loop Manual UAT (DEFERRED)

The unwrap→finalize two-tx flow, the KMS/relayer public decryption of the burn handle, and the
ERC-20 arrival are wallet-, gas-, and relayer-dependent and cannot be proven by unit tests (the
SDK/wagmi own the tx path — mocking would test the mock). Per the time-boxed directive these live
checks were **intentionally deferred** to a single end-of-project session. The app-authored PURE
logic (the honest stage machine, amount validation, error map, pending-persistence shim) is already
locked by vitest, and all automated gates (check-types, build with `/unwrap` emitted, full vitest
suite) are green.

Run every check on the LIVE deployed URL, **not** localhost — the real relayer under COEP
`require-corp` is the phase gate. **UNW-02 is the central judged behavior: verify success is NEVER
shown before the ERC-20 actually arrives.** Mark each `[ ]` → `[x]` and fill results.

## Preconditions

- [ ] Latest commit deployed to the live URL (Phase-1 GitHub→Vercel pipeline).
- [ ] `crossOriginIsolated === true` on load (isolation failures are silent until you encrypt/decrypt).
- [ ] MetaMask connected on **Sepolia** via the existing ChainGuard/connect flow.
- [ ] Wallet holds some Sepolia ETH for gas (two txs per unwrap: request + finalize).
- [ ] Wallet holds a **confidential ERC-7984 balance** to unwrap — if not, first run Phase 4 wrap on a pair (e.g. cUSDC) so there is something to unwrap (this also sets up the SC4 full-loop check).

## Checks

### UNW-01 — Encrypted-input unwrap → ERC-20 arrives (with correct ACL)
- [ ] From a registry PairCard **Unwrap →** (or the Wrap screen's Unwrap toggle) open `/unwrap?token=…` for a pair you hold a confidential balance in.
- [ ] Decrypt the confidential balance (reveal), press **Max**, and submit **Unwrap**. Approve BOTH wallet prompts (the unwrap request tx, then the finalize tx).
- [ ] The unwrap does NOT revert for lack of allowance (the inputProof grants the ACL — no operator/approve step exists or is needed; SC3).
- [ ] After finalize, the underlying **ERC-20 balance increases** by the unwrapped amount (check the finalized-block "ERC-20 arrived" figure and/or MetaMask assets).
- Result: _______________________________________________

### UNW-02 — Honest pending → finalized (NO optimistic success)
- [ ] While the flow runs, the indicator shows an explicit **Request → Decrypting → Finalize → Done** progression.
- [ ] **Success/"Done" is NOT shown at the unwrap-submit step.** After the FIRST tx is mined, the UI sits in **Decrypting** (the oracle wait), never "done".
- [ ] The **Done** state + success copy appear ONLY after the SECOND (finalize) tx completes and the ERC-20 balance refetch shows the increase.
- [ ] On `finalized`, the Phase-3 decrypt shows the **confidential balance dropped** AND the ERC-20 shows the **increase** — both sides change (the honest end-state proof).
- [ ] Note the observed decrypting→finalize latency here (resolves Open Q1): __________ seconds.
- Result: _______________________________________________

### UNW-01/02 — Unwrap all (no decrypt path)
- [ ] On a fresh pair without decrypting, press **Unwrap all** — it unwraps the entire confidential balance (operates on the balance handle, no plaintext amount) through the same honest stages to a real ERC-20 arrival.
- Result: _______________________________________________

### Resume — interrupted finalize recovery (never strand funds)
- [ ] Start an unwrap, let the FIRST (request) tx mine, then reload the tab BEFORE approving finalize.
- [ ] On reopening `/unwrap` for that pair, a **Resume interrupted unwrap** banner appears; pressing it finalizes the burned amount and the ERC-20 arrives (no stranded confidential balance).
- Result: _______________________________________________

### SC4 — Full wrap → decrypt → unwrap loop (the headline)
- [ ] For a token you **just wrapped** in this session (Phase 4): decrypt the confidential balance, then unwrap it back, and confirm the underlying ERC-20 returns — the full **wrap → decrypt → unwrap** loop completes end-to-end on the live URL.
- Result: _______________________________________________

## Notes / anomalies

_Record finalize latency, any resume events, and the partial-amount scale (Open Q3/A3: does a partial
`useUnshield` amount unwrap the exact confidential units entered?) here:_

_______________________________________________
