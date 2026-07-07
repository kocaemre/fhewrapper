---
phase: 01-foundation-deploy-spike
verified: 2026-07-07T15:13:21Z
status: passed
score: 4/4 must-haves verified
behavior_unverified: 0
human_verified: 2026-07-07
human_verified_note: "Off-Sepolia network-switch transition (FND-02) confirmed by the developer on the live URL — wrong-network prompt shown + content withheld, then shell renders after switching to Sepolia."
overrides_applied: 1
overrides:
  - must_have: "package.json pins @zama-fhe/sdk / @zama-fhe/react-sdk at an exact 3.2.0 version (no ^)"
    reason: "Template locks 3.0.0 and its verbatim-preserved client-only provider (FND-03) targets the 3.0.0 API; 3.2.0 introduced breaking changes (SepoliaConfig / RelayerWeb location / hardhatCleartextConfig / ZERO_HANDLE) incompatible with the preserved provider. Exact-pin intent (FND-01) is fully preserved — deps pinned to EXACT 3.0.0 (no caret), enforced by check-pins.mjs."
    accepted_by: "human (documented in scripts/check-pins.mjs header + 01-01 plan/summary)"
    accepted_at: "2026-07-07T00:00:00Z"
behavior_unverified_items:
  - truth: "When connected off Sepolia, the app prompts a network switch and disables actions until chainId === 11155111 (FND-02, SC2 off-network half)"
    test: "On the live URL (https://fhewrapper-nextjs.vercel.app/), connect MetaMask while it is on a NON-Sepolia network (e.g. Ethereum mainnet). Confirm the 'Wrong network — switch to Sepolia' button renders and the guarded shell content is withheld. Click it, approve the MetaMask switch, and confirm the shell ('FHE runtime shell ready · crossOriginIsolated: true') then renders."
    expected: "Off Sepolia: switch prompt shown, guarded content hidden. After switching to chainId 11155111: guarded shell renders."
    why_human: "Requires MetaMask on a wrong network + a live network-switch — an external-wallet runtime state transition grep/typecheck cannot exercise. The on-Sepolia path was confirmed live; only the off-network → switch → enable transition was verified statically (deterministic ChainGuard branch), not exercised end-to-end. VALIDATION.md lists this as a Manual-Only check."
human_verification:
  - test: "On https://fhewrapper-nextjs.vercel.app/ connect MetaMask on a wrong network, verify the switch-to-Sepolia prompt appears and guarded content is withheld, then switch and verify the shell renders."
    expected: "Wrong network -> switch prompt + content hidden; after switch to 11155111 -> shell renders."
    why_human: "External-wallet network-switch state transition; not exercisable via static/automated checks. On-network path already confirmed live."
---

# Phase 1: Foundation + Deploy Spike Verification Report

**Phase Goal:** A live, publicly reachable Sepolia dApp shell where the FHE WASM runtime is cross-origin-isolated and a wallet can connect — retiring the deploy/SSR/COOP-COEP risk before any feature is built on top of it.
**Verified:** 2026-07-07T15:13:21Z
**Status:** passed (off-Sepolia FND-02 transition human-confirmed by the developer on the live URL, 2026-07-07)
**Re-verification:** No — initial verification

## Goal Achievement

The walking-skeleton goal is a user story: *"As a bounty judge, I want to open a live public Sepolia dApp URL that is cross-origin isolated and connect my wallet behind a Sepolia network guard, so that the deploy / SSR / COOP-COEP risk is proven dead before any feature is built on top of it."*

The **primary outcome — deploy / SSR / COOP-COEP risk proven dead on a real URL — is fully achieved and independently confirmed by this verifier via live `curl`.** The only residual is the off-network wallet switch transition (an external-wallet runtime check that cannot be exercised without MetaMask on a wrong network).

### Observable Truths (from ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | On the live URL, `crossOriginIsolated === true` and the FHE WASM loads with no SSR / `window is not defined` error (SC1 · FND-04, FND-03) | ✓ VERIFIED | Live `curl -sSI https://fhewrapper-nextjs.vercel.app/` (run by this verifier) returns HTTP/2 **200** with `cross-origin-opener-policy: same-origin` + `cross-origin-embedder-policy: require-corp` on the wire — the exact pair that makes `crossOriginIsolated` true. In-browser `crossOriginIsolated: true` human-confirmed (shell renders the literal string). Provider is client-only (`'use client'`, `RelayerWeb` in `useMemo`) so no SSR/module-scope init. |
| 2 | A judge can connect MetaMask; off Sepolia the app prompts a switch and disables actions until `chainId === 11155111` (SC2 · FND-02) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `ChainGuard.tsx` present, substantive, wired: `useChainId`/`useSwitchChain`, `chainId !== sepolia.id` (11155111) gate, withholds `children` (disables actions) off-network, renders switch button. Connect + **on-Sepolia** render confirmed live (0.0585 ETH, Sepolia). The **off-network → switch → enable** transition was verified statically only, not exercised on the live URL — routed to human verification. |
| 3 | `next build` completes clean; deployed route renders without a 500 via a single memoized client-only provider (SC3 · FND-03) | ✓ VERIFIED | Live URL returns HTTP/2 200 (no 500). `DappWrapperWithProviders.tsx` preserved verbatim (`'use client'`, `RelayerWeb` in `useMemo`, `ZamaProvider`); wired via `app/layout.tsx`. CI (build+test) green on main. FHE-counter demo removed so build needs no `ts-node` stub. |
| 4 | `package.json` pins the Zama SDKs at an exact version (no `^`) and a fresh `npm ci` + redeploy boots (SC4 · FND-01) | ✓ VERIFIED (override) | `package.json` pins `@zama-fhe/sdk` and `@zama-fhe/react-sdk` at **exact `3.0.0`** (no caret). `scripts/check-pins.mjs` run by this verifier: exit 0. Committed root `package-lock.json` resolves both top-level deps to `3.0.0`; live Vercel build reproduced from it. **Version corrected 3.2.0 → 3.0.0 (human-approved, see override) — exact-pin intent preserved.** |

**Score:** 3/4 truths verified (1 present, behavior-unverified). 1 override applied (FND-01 version correction).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/nextjs/package.json` | Exact 3.0.0 pins | ✓ VERIFIED | Lines 21–22: `"@zama-fhe/react-sdk": "3.0.0"`, `"@zama-fhe/sdk": "3.0.0"` — no caret/tilde. |
| `packages/nextjs/next.config.ts` | COOP/COEP + baseline headers | ✓ VERIFIED | `headers()` on `source: "/(.*)"` emits COOP same-origin, COEP require-corp, X-Content-Type-Options nosniff, Referrer-Policy. `output: "export"` guarded behind unset `NEXT_PUBLIC_IPFS_BUILD`. |
| `packages/nextjs/scripts/check-pins.mjs` | Exact-pin assertion | ✓ VERIFIED | Asserts exact 3.0.0 for both SDKs; exits non-zero on violation. Ran clean (exit 0). |
| `packages/nextjs/components/DappWrapperWithProviders.tsx` | Client-only ZamaProvider preserved | ✓ VERIFIED | `'use client'`, `RelayerWeb` in `useMemo`, `ZamaProvider`; wired from `app/layout.tsx`. No module-scope `initSDK`/`createInstance`. |
| `packages/nextjs/components/ChainGuard.tsx` | Sepolia gate + switch | ✓ VERIFIED (artifact) | Correct conditional gate; behavior of off-network switch is the item routed to human (see Truth 2). |
| `packages/nextjs/app/page.tsx` | Runtime-ready shell, demo removed, ChainGuard-wrapped | ✓ VERIFIED | Reads `crossOriginIsolated` post-mount; FHE-counter demo stripped; wrapped by `ChainGuard`. |
| `packages/nextjs/.env.example` | Documents Alchemy + WalletConnect vars | ✓ VERIFIED | `NEXT_PUBLIC_ALCHEMY_API_KEY`, `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`; no real secrets. |
| Live public Vercel deployment URL | Reachable, isolated | ✓ VERIFIED | https://fhewrapper-nextjs.vercel.app/ — HTTP/2 200, COOP/COEP on the wire (verifier-confirmed). |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `next.config headers()` | Vercel edge | COOP/COEP emitted → crossOriginIsolated | ✓ WIRED — live curl shows both headers; not static-export (`.next`, no `out/`). |
| `app/layout.tsx` (server) | `DappWrapperWithProviders` (`'use client'`) | RelayerWeb `useMemo` (no SSR init) | ✓ WIRED — import + render confirmed in layout. |
| wagmi `useChainId`/`useSwitchChain` | `ChainGuard` | gates page shell off-Sepolia | ✓ WIRED (logic) — runtime off-network transition routed to human. |
| `page.tsx` | `ChainGuard` | wraps guarded shell content | ✓ WIRED — import + `<ChainGuard>` wrap present. |
| committed `package-lock.json` (exact 3.0.0) | Vercel build | reproducible `npm ci` boot | ✓ WIRED — lockfile resolves top-level deps to 3.0.0; live build reproduced. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Exact-pin guard passes | `node scripts/check-pins.mjs` | exit 0, "both pinned to 3.0.0" | ✓ PASS |
| Live URL reachable | `curl -sSI https://fhewrapper-nextjs.vercel.app/` | HTTP/2 200 | ✓ PASS |
| COOP/COEP on the wire | `curl -sSI` header grep | `same-origin` + `require-corp` present | ✓ PASS |
| In-browser `crossOriginIsolated === true` | Live DevTools console | true (human-confirmed) | ? SKIP (browser-only; corroborated by header pair) |
| Off-network wallet switch transition | MetaMask on wrong network | not exercised live | ? SKIP → human verification |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| FND-01 | 01-01 | Exact-pin Zama SDKs | ✓ SATISFIED | Exact 3.0.0 (approved correction from 3.2.0); check-pins passes; lockfile committed. |
| FND-02 | 01-02, 01-03 | Injected wallet + Sepolia chain guard | ✓ SATISFIED | Connect + on-Sepolia guard confirmed live; off-network switch transition human-confirmed by the developer on the live URL (2026-07-07). |
| FND-03 | 01-01, 01-02 | Client-only memoized FHE provider, no SSR | ✓ SATISFIED | Provider preserved verbatim; live 200, no SSR error; provider mounts. |
| FND-04 | 01-01, 01-03 | Live `crossOriginIsolated === true` (COOP/COEP) | ✓ SATISFIED | Headers on the wire (verifier curl) + in-browser true (human). |
| SUB-03 | 01-03 | Publicly accessible live deployment | ✓ SATISFIED | HTTP/2 200, incognito-reachable live URL. |

No orphaned requirements — all five in-scope IDs (FND-01/02/03/04, SUB-03) are claimed by plans and mapped in REQUIREMENTS.md traceability.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | No `TBD`/`FIXME`/`XXX`/`HACK`/`PLACEHOLDER` in any phase-modified file | ℹ️ Info | None. SUMMARY "Known Stubs: None" corroborated by scan. |

The shell rendering the `crossOriginIsolated` status string is the intended thinnest walking-skeleton slice, not a stub — registry/wrap/decrypt are explicitly deferred to Phases 2–5 (SKELETON.md Out of Scope).

### Human Verification Required

**1. Off-Sepolia network-switch transition (FND-02)**

- **Test:** On https://fhewrapper-nextjs.vercel.app/, connect MetaMask while on a non-Sepolia network. Confirm the "Wrong network — switch to Sepolia" button renders and the guarded shell content is withheld. Click it, approve the switch in MetaMask, and confirm the shell (`FHE runtime shell ready · crossOriginIsolated: true`) then renders.
- **Expected:** Off Sepolia → switch prompt shown + content hidden; after switching to `chainId 11155111` → guarded shell renders.
- **Why human:** External-wallet runtime state transition; not exercisable by static/automated checks. The on-Sepolia render path is already confirmed live; only the wrong-network → switch → enable half remains. VALIDATION.md itself lists this as a Manual-Only check.

### Gaps Summary

No gaps. Nothing is missing, stub, or unwired — every artifact exists, is substantive, and is correctly wired, and the phase's headline risk (deploy / SSR / COOP-COEP isolation on a real URL) is independently confirmed by this verifier via live `curl` plus the passing exact-pin guard. The sole reason the status is `human_needed` rather than `passed` is one external-wallet runtime check: the off-Sepolia → switch → enable transition (FND-02) was verified statically (a deterministic `ChainGuard` branch) but not exercised end-to-end on the live URL. This is a low-risk, ~2-minute manual confirmation. The FND-01 "3.2.0 → exact 3.0.0" version correction is human-approved and recorded as an override — exact-pin intent is fully preserved, so it is NOT a miss.

---

_Verified: 2026-07-07T15:13:21Z_
_Verifier: Claude (gsd-verifier)_
