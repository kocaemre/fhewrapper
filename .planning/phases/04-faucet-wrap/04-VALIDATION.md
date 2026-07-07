---
phase: 4
slug: faucet-wrap
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-07
---

# Phase 4 — Validation Strategy

> Per-phase validation contract. The wrap PREVIEW math + the error taxonomies are the correctness-critical
> PURE logic → unit-tested (vitest). The faucet `mint`, `useShield` wrap tx, and the wrap→decrypt==preview
> proof are SDK/wagmi/relayer-owned → INTEGRATION/MANUAL on the live URL (mocking would test the mock).
> Floor-it: live proofs deferred to a single end-of-project UAT session. Source: 04-RESEARCH.md ## Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.10 (installed, configured Phase 2/3) — no new dependency |
| **Config file** | `packages/nextjs/vitest.config.ts` |
| **Quick run command** | `cd packages/nextjs && npx vitest run <file>` |
| **Full suite command** | `cd packages/nextjs && npx vitest run` |
| **Estimated runtime** | units <5s; `npm run build` ~60–90s (wave merge); live faucet/wrap/decrypt = manual on Vercel URL |

---

## Sampling Rate

- **After every task commit:** `npx vitest run <changed .test.ts>` (previewWrap + error maps) + `npm run check-types`
- **After every plan wave:** full `npx vitest run` + `npm run build`
- **Before `/gsd-verify-work`:** full unit suite green + a REAL faucet→wrap→decrypt on the deployed URL proving decrypt == preview for one 6-dp (cUSDC) AND one 18-dp (cWETH) pair + `next build` clean
- **Max feedback latency:** ~90s (units); live proof is a manual gate (deferred to end-of-project UAT)

---

## Per-Requirement Verification Map

| Req ID | Behavior | Test Type | Automated Command | File Exists | Status |
|--------|----------|-----------|-------------------|-------------|--------|
| WRP-02 | `previewWrap` floor division + `belowOneUnit` (rate=1 and rate=1e12) | unit (pure) | `npx vitest run lib/previewWrap.test.ts` | ❌ W0 | ⬜ pending |
| WRP-02 | "1 whole underlying → 1.0 confidential" for 6-dp & 18-dp | unit (pure) | `npx vitest run lib/previewWrap.test.ts -t "one whole"` | ❌ W0 | ⬜ pending |
| WRP-01 | Wrap error map (rejected/approval/revert/insufficient-ERC20) → copy | unit (pure) | `npx vitest run lib/wrapErrors.test.ts` | ❌ W0 | ⬜ pending |
| FCT-02 | Faucet error map (gas/cap/wrong-net/tGBP) → copy; amount clamp ≤ 1e6 | unit (pure) | `npx vitest run lib/faucetErrors.test.ts` | ❌ W0 | ⬜ pending |
| FCT-01 | Faucet `mint` → underlying balance arrives | integration / manual (live + gas) | manual on live URL | ❌ manual | ⬜ pending |
| WRP-01 | approve → wrap → confirmation, 4-stage indicator progresses | integration / manual | manual on live URL | ❌ manual | ⬜ pending |
| WRP-01/02 | Correctness proof: wrap N → decrypt == preview | integration / manual (relayer) | manual on live URL | ❌ manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `lib/previewWrap.ts` + `.test.ts` — floor division, `belowOneUnit`, refund, 6-dp & 18-dp fixtures (WRP-02, no chain call) — RED-first
- [ ] `lib/wrapErrors.ts` + `.test.ts` — `ZamaError` subclass → copy (WRP-01 messaging) — RED-first
- [ ] `lib/faucetErrors.ts` + `.test.ts` — gas/cap/network/tGBP mapping + amount clamp (FCT-02) — RED-first
- [ ] Manual UAT checklist (04-UAT.md): faucet arrives, 4-stage indicator, wrap N → decrypt N == preview (cUSDC + cWETH) on the live URL

*Hook-level wrap/faucet is NOT unit-tested — the SDK/wagmi own the tx path. Cover app-authored pure logic in units; cover integration via live UAT.*

---

## Manual-Only Verifications (live Vercel URL — wallet + gas + relayer; DEFERRED to end-of-project session)

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Faucet claim → balance arrives | FCT-01 | Live `mint` tx + gas | On the live URL, claim a cTokenMock underlying ERC-20; confirm the underlying balance increases |
| Faucet edge cases readable | FCT-02 | Runtime revert/network states | Trigger wrong-network / insufficient-ETH / tGBP-restricted; confirm clear copy, no raw revert |
| Wrap 4-stage progression | WRP-01 | Live approve→wrap tx | Wrap an amount; confirm approve→wrap→confirming→done indicator progresses to a receipt |
| **Correctness proof: wrap N → decrypt == preview** | WRP-01/02 | Relayer decrypt of the wrapped handle | Wrap 1 whole underlying of a 6-dp (cUSDC) AND an 18-dp (cWETH) pair; decrypt (Phase 3) → confidential balance equals the preview (1.0). Also resolves RESEARCH Open Q1 (`useShield` amount = underlying-raw) |

---

## Validation Sign-Off

- [ ] All app-authored pure logic (previewWrap, wrapErrors, faucetErrors) unit-tested RED-first; SDK/wagmi behaviors have a Manual-Only entry
- [ ] Sampling continuity: no 3 consecutive tasks without a vitest/check-types check
- [ ] Wave 0 covers the 3 pure-logic modules
- [ ] No watch-mode flags (`vitest run`)
- [ ] Feedback latency < 90s (units); live proof is the deferred phase gate
- [x] `nyquist_compliant: true` (validation substance in RESEARCH + unit tasks; correctness proven on the live URL at end-of-project UAT)

**Approval:** pending
