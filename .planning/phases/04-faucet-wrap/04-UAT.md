---
phase: 04-faucet-wrap
type: manual-uat
status: pending
deferred: true
when: end-of-project (single manual session before final submission)
url: https://fhewrapper-nextjs.vercel.app/
requirements: [FCT-01, FCT-02, WRP-01, WRP-02]
resolves: "RESEARCH Open Q1/A2 (useShield amount scale = underlying-raw) + Open Q2 (approvalStrategy) + Q3 (faucet amount/tGBP)"
---

# Phase 4 — Live-URL Faucet + Wrap Manual UAT (DEFERRED)

The faucet mint and the approve→wrap→decrypt flow are wallet-, gas-, and relayer-dependent
and cannot be proven by unit tests (the SDK/wagmi own the tx path — mocking would test the
mock). Per the time-boxed directive these live checks were **intentionally deferred** to a
single end-of-project session. The app-authored PURE logic (preview math, error maps, amount
clamp) is already locked by vitest, and all automated gates (check-types, build, full vitest
suite) are green.

Run every check on the LIVE deployed URL, **not** localhost — the real relayer under COEP
`require-corp` is the phase gate for the decrypt proof. Mark each `[ ]` → `[x]` and fill results.

## Preconditions

- [ ] Latest commit deployed to the live URL (Phase-1 GitHub→Vercel pipeline).
- [ ] `crossOriginIsolated === true` on load (isolation failures are silent until you decrypt).
- [ ] MetaMask connected on **Sepolia** via the existing ChainGuard/connect flow.
- [ ] Wallet holds some Sepolia ETH for gas (top up from a Sepolia ETH faucet if the low-ETH banner shows).

## Checks

> **04-01 readiness (2026-07-08):** the faucet surface these checks exercise is now live in-repo — `/faucet` route under ChainGuard, Header Faucet nav, per-pair claim rows (`useFaucet` public mint), the low-Sepolia-ETH banner, and the tGBP restricted-copy disable. All automated gates green (vitest 64/64, check-types, build). The checks below remain **pending** the end-of-project live-URL session.

> **04-02 readiness (2026-07-08):** the wrap surface for WRP-01/WRP-02 is now live in-repo — the PairCard **Wrap →** CTA links to `/wrap?token=<confidential>`, the `/wrap` route resolves the pair from the trusted registry under ChainGuard, and `WrapPanel` renders the From-ERC-20 / To-ERC-7984 preview (`useWrap` → onchain `rate()` + `previewWrap`, never hardcoding 18), the 4-stage indicator (`onApprovalSubmitted`/`onShieldSubmitted`/receipt via `useShield`), `toWrapError` copy, the below-one-unit disable, and the on-`done` Phase-3 `PairCardDecrypt` for the decrypt==preview proof. Pure logic locked by vitest (previewWrap + wrapErrors, 11 tests); all automated gates green (vitest 75/75, check-types, build with `/wrap` emitted). The live approve→wrap→decrypt==preview checks below (and the RESEARCH Open Q1/A2 amount-scale confirmation) remain **pending** the end-of-project live-URL session — the tx path is SDK/wagmi-owned and cannot be unit-proven.

### FCT-01 — Claim underlying ERC-20 (balance arrives)
- [ ] Open `/faucet` (Faucet nav link). Click **Claim** on a freely-mintable pair (e.g. USDCMock).
- [ ] After the receipt, the underlying ERC-20 balance increases (check MetaMask assets or the wrap From-balance).
- Result: _______________________________________________

### FCT-02 — Graceful edge cases (no raw revert)
- [ ] On a near-zero-ETH wallet, the low-Sepolia-ETH banner shows with a working ETH-faucet link.
- [ ] The **tGBP** (ctGBP) row is disabled with the "restricted — official testnet faucet" copy (its mint is restricted; RESEARCH Pitfall 3). If left enabled and it reverts, confirm the copy is readable, not a raw revert.
- [ ] (Optional) An over-cap amount surfaces the "exceeds 1,000,000-per-call" copy, not a raw revert.
- Result: _______________________________________________

### WRP-02 — Onchain-accurate preview (never hardcode 18)
- [ ] Open a pair's **Wrap →** from a registry card → `/wrap?token=…`.
- [ ] On a **6-dp** pair (cUSDC, rate=1): enter `1` → preview shows `1` cUSDC.
- [ ] On an **18-dp** pair (cWETH, rate=1e12): enter `1` → preview shows `1` cWETH (NOT 1e12 / wildly off).
- [ ] Enter a tiny amount below one confidential unit (e.g. `0.0000001` WETH) → "below one confidential unit" warning shows and **Wrap is disabled**.
- Result: _______________________________________________

### WRP-01 — approve → wrap → confirmation (4-stage indicator)
- [ ] Enter a valid amount, click **Approve & Wrap** → the indicator progresses Approve → Wrap → Confirm → Done (driven by onApprovalSubmitted / onShieldSubmitted / receipt).
- [ ] Success is shown only after the receipt (not at submit).
- Observed approvalStrategy behavior (max = one approval then future wraps skip it): __________

### WRP-01/02 — CORRECTNESS PROOF (top judging axis): decrypt == preview
- [ ] Immediately after the wrap receipt, use the on-`/wrap` decrypt surface (Phase-3) to reveal the new confidential balance.
- [ ] The decrypted cleartext **equals the preview** — 1 whole underlying → `1.0` confidential — for **cUSDC** (6-dp) AND **cWETH** (18-dp).
- **Resolves RESEARCH Open Q1/A2:** confirm `useShield` `amount` is UNDERLYING-raw base units (if the 18-dp cWETH wrap yields 1.0 cWETH, the scale is confirmed).
- cUSDC decrypt == preview? __________  cWETH decrypt == preview? __________

### Cross-cutting
- [ ] Both flows are gated: a disconnected / wrong-network wallet cannot claim or wrap (ChainGuard).
- [ ] Theme toggle (parchment/cellar) — colors follow on /faucet and /wrap.
- Result: _______________________________________________

## Sign-off

- [ ] All FCT-01/FCT-02/WRP-01/WRP-02 checks pass on the live URL.
- [ ] Open Questions Q1/A2 (amount scale), Q2 (approvalStrategy), Q3 (faucet amount/tGBP) recorded above.
- Signed / date: _______________________________________________
