---
phase: 04-faucet-wrap
verified: 2026-07-08
status: passed
score: automated gates green; live faucet/wrap/decrypt==preview deferred to 04-UAT.md
human_verified: deferred
human_verified_note: "Per user directive (floor-it / user asleep): live-URL proofs (faucet arrives, wrap 4-stage, wrap N → decrypt == preview) deferred to the single end-of-project manual UAT session in 04-UAT.md. Code + automated verification passed now."
---

# Phase 4: Faucet + Wrap — Verification Report

**Phase Goal:** A cold judge can claim official cTokenMock test tokens and wrap an ERC-20 into its ERC-7984 equivalent, with a preview that matches the onchain result (verified via Phase-3 decrypt).
**Status:** passed (automated) · live proofs deferred to 04-UAT.md
**Verified:** 2026-07-08 (orchestrator-level, floor-it — per-phase verifier + plan-checker skipped; planner's on-disk symbol verification + automated gates relied upon)

## Automated verification (passed)

- **Faucet (verified mechanism):** research resolved the CLAUDE.md GAP — underlying ERC-20s expose a public `mint(address,uint256)` (selector 0x40c10f19, no access control). `useFaucet` uses it; NO cooldown fiction. tGBP restricted-mint handled gracefully.
- **Wrap hooks (correctness anchor):** `useShield({ tokenAddress, wrapperAddress })` verified on the installed 3.0.0 `.d.ts` (NOT docs' `{ address }`); approval auto-handled; 4-stage driven by `onApprovalSubmitted`/`onShieldSubmitted`.
- **Preview math (WRP-02, unit-proven):** `previewWrap` — `rate()=10^(underlyingDec−wrapperDec)`, `floor(raw/rate)`, `belowOneUnit`; "1 whole underlying → 1.0 confidential" proven for a 6-dp (cUSDC) AND an 18-dp (cWETH) pair. Never hardcodes 18.
- **Tests:** vitest 75/75 green (64 prior + 11 new). check-types exit 0, build exit 0 (`/faucet` + `/wrap` routes emitted).
- **No regression:** Phases 1/2/3 intact (provider/COOP-COEP, ungated browse, decrypt). The PairCard `Wrap →` CTA is now functional (was inert).

## Requirements Coverage

| Req | Status | Evidence |
|-----|--------|----------|
| FCT-01 | ✓ code / ⏳ live UAT | `useFaucet` public-mint of the pair's underlying ERC-20 to the wallet; live "balance arrives" in 04-UAT.md |
| FCT-02 | ✓ code | `faucetErrors` gas/cap/network/tGBP → readable copy; amount clamp ≤1e6; no raw revert |
| WRP-01 | ✓ code / ⏳ live UAT | `useWrap` (useShield) 4-stage approve→wrap→confirm; `wrapErrors` map; live 4-stage in 04-UAT.md |
| WRP-02 | ✓ code / ⏳ live UAT | `previewWrap` rate/floor/below-unit unit-proven; live wrap N → decrypt == preview in 04-UAT.md |

## Deferred (to 04-UAT.md — single end-of-project manual session)

Relayer/tx-dependent proofs (need wallet + gas + live relayer on the deployed URL):
1. Faucet claim → underlying balance arrives (FCT-01).
2. Wrap 4-stage progresses to receipt (WRP-01).
3. **Correctness proof:** wrap 1 whole underlying (cUSDC 6-dp + cWETH 18-dp) → Phase-3 decrypt shows 1.0 == preview (WRP-01/02); resolves `useShield` amount-scale (RESEARCH Open Q1).

## Verdict

Code + automated verification PASSED. Phase advances; live faucet/wrap/decrypt UAT tracked for the end-of-project manual pass.
