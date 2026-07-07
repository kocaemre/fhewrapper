---
phase: 2
slug: registry-browse
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-07
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Registry browse is read-only wagmi/viem data + client render. The correctness-critical
> logic is three PURE functions (merge/dedup, symbol-normalize, multicall-regroup) — these
> are unit-tested RED-first; onchain reads + the visual UI are integration/manual.
> Source of substance: 02-RESEARCH.md ## Validation Architecture (verified via live eth_call).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `vitest` (devDependency) — installed in Wave 0 behind a blocking-human legitimacy checkpoint (02-01 Task 1). None installed before this phase. |
| **Config file** | `packages/nextjs/vitest.config.ts` (created Wave 0) |
| **Quick run command** | `npm run check-types && npm run lint` (fast; available immediately) |
| **Full suite command** | `npx vitest run` (pure-function units after Wave 0 install) |
| **Estimated runtime** | check-types+lint ~10–20s; vitest units <5s; full `npm run build` ~60–90s (reserved for wave merge) |

---

## Sampling Rate

- **After every task commit:** `npm run check-types && npm run lint` (fast feedback; catches type/lint regressions)
- **After every plan wave:** `npx vitest run` (pure-function units: mergePairs, tokenSymbol, regroupMeta) + `npm run build`
- **Before `/gsd-verify-work`:** full unit suite green + live-URL visual check of grid / skeleton / empty / error states
- **Max feedback latency:** ~90 seconds (per-task check-types/lint keeps it well under)

---

## Per-Requirement Verification Map

| Req ID | Behavior | Test Type | Automated Command | File Exists | Status |
|--------|----------|-----------|-------------------|-------------|--------|
| REG-01 | Registry read returns pairs from `0x2f0750…128e` (never hardcoded) | integration (live RPC) | `npx vitest run registry/registryRead.test.ts` | ❌ W0 | ⬜ pending |
| REG-02 | Revoked pairs retained + flagged via `isValid` | unit | `npx vitest run lib/mergePairs.test.ts -t "revoked"` | ❌ W0 | ⬜ pending |
| REG-03 | Metadata multicall regroups 6-per-pair correctly | unit | `npx vitest run lib/regroupMeta.test.ts` | ❌ W0 | ⬜ pending |
| REG-04 | All 7 branded cToken addresses present in output | integration | `npx vitest run registry/registryRead.test.ts -t "7 cTokens"` | ❌ W0 | ⬜ pending |
| REG-05 | Merge dedup by ERC-7984 addr, onchain wins | unit | `npx vitest run lib/mergePairs.test.ts` | ❌ W0 | ⬜ pending |
| REG-06 | Card shows both addresses + metadata + valid/revoked badge | manual/visual | live URL visual check | manual | ⬜ pending |
| REG-07 | README add-a-pair example present | manual | doc review | manual | ⬜ pending |
| — | `normalizeSymbol`/`iconKey` maps `USDCMock`→`usdc`, `cUSDCMock`→`usdc` | unit | `npx vitest run lib/tokenSymbol.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Framework install: `npm i -D vitest @vitest/coverage-v8` (pin versions; blocking-human legitimacy check before install — 02-01 Task 1)
- [ ] `packages/nextjs/vitest.config.ts`
- [ ] `lib/mergePairs.test.ts` — REG-02, REG-05 (dedup / onchain-wins / revoked retained) — written RED-first
- [ ] `lib/tokenSymbol.test.ts` — icon-key normalization (`USDCMock`→`usdc`, `cUSDCMock`→`usdc`) — RED-first
- [ ] `lib/regroupMeta.test.ts` — REG-03 (chunk-of-6 regroup + `allowFailure` partial handling) — RED-first
- [ ] `registry/registryRead.test.ts` — integration read vs live Sepolia (REG-01/04); may be network-gated/skippable in CI

*Pure functions (merge, normalize, regroup) are the high-value automated targets; onchain reads and the visual UI are integration/manual.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pair card renders both-network addresses + metadata + valid/revoked badge | REG-06 | Visual layout fidelity to the Cellar Registry design | On the live URL, confirm each card shows ERC-20 + ERC-7984 address (copyable), symbol/name/decimals, and a valid or revoked badge |
| Full onchain array renders (≥9 pairs, 7 branded present, revoked flagged) | REG-01/04 | Live registry state on real RPC | Open live URL; count pairs (≥9), confirm the 7 branded cTokens appear with real icons, revoked shown with a badge (not hidden) |
| README add-a-pair flow | REG-07 | Doc correctness | Follow the README example to add a `pairs.config.ts` entry; confirm it appears in the UI, deduped (onchain wins) |
| Search + valid/revoked filter | REG-02 | Interactive client behavior | Type in search → list filters by symbol/name; toggle ALL/VALID/REVOKED → list filters by status |

---

## Validation Sign-Off

- [ ] All tasks have an `<automated>` verify (check-types/lint/vitest) or a Manual-Only entry above
- [ ] Sampling continuity: no 3 consecutive tasks without a check-types/lint or vitest check
- [ ] Wave 0 covers vitest install + the 3 pure-function test files (RED-first)
- [ ] No watch-mode flags (`vitest run`, not `vitest`)
- [ ] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter (validation substance present in RESEARCH + 02-01 TDD tasks)

**Approval:** pending
