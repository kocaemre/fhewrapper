---
phase: 1
slug: foundation-deploy-spike
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-07
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> This is an infrastructure/deploy phase — most success criteria are observable/manual (live-URL console checks, deploy state) rather than unit-testable. See 01-RESEARCH.md ## Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | none for logic tests — Next.js build + live-URL observation is the primary gate |
| **Config file** | none — Wave 0 scaffolds from fhevm-react-template |
| **Quick run command** | `npm run build` (must complete clean, no SSR / `window is not defined`) |
| **Full suite command** | `npm run build && npm run lint` |
| **Estimated runtime** | ~60–120 seconds |

---

## Sampling Rate

- **After every task commit:** `npm run build` (catches SSR/module-scope init regressions early)
- **After every plan wave:** `npm run build && npm run lint`
- **Before `/gsd-verify-work`:** clean build + a real Vercel deploy reachable
- **Max feedback latency:** ~120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| (populated by planner) | 01 | 1 | FND-01 | — | exact-pin present | smoke | `grep '"3.2.0"' package.json` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Project scaffolded from `zama-ai/fhevm-react-template` (`packages/nextjs`) — `npm run build` succeeds
- [ ] `@zama-fhe/sdk` + `@zama-fhe/react-sdk` pinned to exact `3.2.0` (no caret)

*Framework note: no unit-test framework required for this deploy-focused phase; verification is build + live-URL observation.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `crossOriginIsolated === true` on live URL | FND-04 | Requires a real deploy; localhost differs | Open deployed URL → DevTools console → type `crossOriginIsolated` → must be `true` |
| FHE WASM loads with no SSR / `window is not defined` | FND-03 | Runtime-only, observed on live deploy | Load deployed route; console shows no SSR/window errors; provider mounts |
| Wallet connect + Sepolia guard | FND-02 | Requires MetaMask + network switch | Connect on wrong network → app prompts switch; actions disabled until `chainId === 11155111` |
| Publicly reachable deployment | SUB-03 | External reachability | Open the URL in a fresh/incognito browser with no local server |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify (build/smoke) or a Manual-Only entry above
- [ ] Sampling continuity: no 3 consecutive tasks without a build check
- [ ] Wave 0 covers scaffold + exact-pin
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
