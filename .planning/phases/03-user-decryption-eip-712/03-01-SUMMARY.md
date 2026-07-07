---
phase: 03-user-decryption-eip-712
plan: 01
subsystem: user-decryption
status: complete
tags: [fhe, eip-712, user-decryption, zama-sdk, blur-reveal, tdd]
dependency_graph:
  requires:
    - "Phase 1: DappWrapperWithProviders (ZamaProvider + RelayerWeb(SepoliaConfig) + IndexedDB stores)"
    - "Phase 1: crossOriginIsolated (require-corp) for the FHE WASM worker"
    - "Phase 2: PairCard, RegistryPair type, normalizeSymbol"
  provides:
    - "hooks/useUserDecrypt — reusable 4-stage decrypt engine (reused by 03-03 paste panel + Phases 4/5 wrap/unwrap results)"
    - "lib/decryptErrors — toDecryptError taxonomy + isZeroBalance"
    - "lib/formatConfidential — decimals-driven cleartext formatting"
    - "components/decrypt/PairCardDecrypt — per-card blur→reveal decrypt"
  affects:
    - "components/registry/PairCard (Section 4 decrypt row appended)"
    - "styles/globals.css (.cipher-blur / .reveal-num blur→reveal keyframes)"
tech_stack:
  added: []
  patterns:
    - "Single reusable non-token-specific EIP-712 permit via useAllow (DEC-03)"
    - "Explicit-trigger decrypt (enabled-gated useConfidentialBalance) — no auto-decrypt on mount"
    - "Typed ZamaError → UI reason taxonomy (instanceof + matchAclRevert, never string-matching)"
    - "Self-gated per-card component (registry browse stays ungated — no ChainGuard wrap)"
key_files:
  created:
    - packages/nextjs/lib/decryptErrors.ts
    - packages/nextjs/lib/decryptErrors.test.ts
    - packages/nextjs/lib/formatConfidential.ts
    - packages/nextjs/lib/formatConfidential.test.ts
    - packages/nextjs/hooks/useUserDecrypt.ts
    - packages/nextjs/components/decrypt/PairCardDecrypt.tsx
  modified:
    - packages/nextjs/components/registry/PairCard.tsx
    - packages/nextjs/styles/globals.css
decisions:
  - "Imported error classes + matchAclRevert + isZeroHandle from @zama-fhe/react-sdk (all re-exported from 3.0.0; verified loads cleanly in node vitest)."
  - "useIsAllowed fed [tokenAddress ?? zeroAddress] to satisfy the non-empty [Address, ...Address[]] tuple (W2) — the actual decrypt is gated by the enabled flag, so no relayer call fires on the placeholder."
  - "NoCiphertextError is treated as a valid zero reveal (chip DECRYPTED BALANCE / body 0), rendered as 0 not an error (DEC-04)."
  - "Added .cipher-blur / .reveal-num CSS (functional blur→reveal per 03-UI-SPEC) with prefers-reduced-motion fallbacks — reuses existing inkPulse, no new aesthetic."
metrics:
  duration_min: 10
  completed: 2026-07-07
  tasks: 2
  files_changed: 8
  tests: 43
---

# Phase 3 Plan 01: User-Decryption Shared Engine + Per-Card Blur→Reveal Summary

Test-locked decrypt pure-logic (ZamaError→UI taxonomy + decimals formatting) plus the reusable `useUserDecrypt` EIP-712 engine, wired into the Phase-2 PairCard as a self-gated per-card blur→reveal that reveals the correct cleartext ERC-7984 balance on Sepolia.

## What Was Built

**Task 1 — test-locked pure logic (RED→GREEN):**
- `lib/decryptErrors.ts` — `toDecryptError(e)` maps every relevant `ZamaError` subclass (`SigningRejectedError`, `DecryptionFailedError`, `RelayerRequestFailedError`, `NoCiphertextError`, `ConfigurationError`, generic `ZamaError`) plus on-chain ACL reverts (`matchAclRevert`) and unknowns to the exact 03-UI-SPEC `{chip, body, recoverable}` triplet. Ordering catches signing-rejected and the no-ACL group before the generic fallthrough. `isZeroBalance(handle)` delegates to `isZeroHandle`.
- `lib/formatConfidential.ts` — `formatConfidentialAmount(value, decimals)` via viem `formatUnits`; decimals-driven, non-18-safe (Pitfall 5).
- 16 new unit tests, committed RED (49dbc37) before GREEN (7c76aab).

**Task 2 — shared engine + per-card decrypt:**
- `hooks/useUserDecrypt.ts` — reusable engine: `useAllow` (one reusable EIP-712 permit, DEC-03) + `useIsAllowed` (cached-permit skip, non-empty tuple per W2) + `useConfidentialBalance` (enabled-gated explicit-trigger decrypt, DEC-01). 4-stage machine (`idle → signing → decrypting → revealed | error`) with `reveal()` / `reset()`; a settle effect flips to `error`/`revealed` on query resolution so there is never a hanging spinner (DEC-04).
- `components/decrypt/PairCardDecrypt.tsx` — self-gates on `isConnected && chainId === sepolia.id` (muted hint otherwise); blur→reveal treatment, typed error chip via `toDecryptError`, `NoCiphertext`→`0`, cleartext formatted by the token's own decimals.
- `PairCard.tsx` — renders `<PairCardDecrypt>` as Section 4; existing sections untouched; onchain strings stay JSX-escaped (T-02-01 carried).
- `globals.css` — `.cipher-blur` / `.reveal-num` keyframes with reduced-motion fallbacks.

## Verification Results

- `npx vitest run` — full suite green: **43 tests / 6 files** (Phase-2 units + the two new pure-logic suites).
- `npm run check-types` — exit 0.
- `npm run lint` — no ESLint warnings or errors.
- `npm run build` — exit 0 (pre-existing `@metamask/sdk` optional-dep `async-storage` warning only; unrelated to this plan).
- No `useGrantPermit` / `useHasPermit` / `useDecryptValues` imports anywhere (verified absent) — only installed 3.0.0 symbols used.
- Live in-browser relayer-dependent decrypt (DEC-01/03/04 end-to-end) is deferred to the 03-03 phase-gate checkpoint on the deployed URL.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `useIsAllowed` empty-tuple type error**
- **Found during:** Task 2
- **Issue:** The plan's illustrative `contractAddresses: tokenAddress ? [tokenAddress] : []` fails check-types — the 3.0.0 config type is a NON-EMPTY `[Address, ...Address[]]` tuple (advisory W2).
- **Fix:** Pass `[tokenAddress ?? zeroAddress]`; the real decrypt stays gated by the `enabled` flag, so the placeholder only performs a cheap local IndexedDB permit read (reports "no permit"), never a relayer call.
- **Files modified:** packages/nextjs/hooks/useUserDecrypt.ts
- **Commit:** d5e10ac

**2. [Rule 2 - Missing critical UX] Added blur→reveal CSS keyframes**
- **Found during:** Task 2
- **Issue:** The 03-UI-SPEC blur→reveal (`.cipher-blur` idle + `.reveal-num` reveal) requires CSS keyframes that did not exist; inline styles cannot express keyframe animation or `prefers-reduced-motion` fallbacks.
- **Fix:** Added `.cipher-blur` / `.reveal-num` (+ `revealNum` keyframe) reusing the existing `inkPulse`, with reduced-motion overrides that keep the functional blur but drop motion. No new aesthetic introduced.
- **Files modified:** packages/nextjs/styles/globals.css
- **Commit:** d5e10ac

## Threat Model Coverage

- **T-03-01 (Info Disclosure):** cleartext lives only in React state/session memory; never logged, never sent to a backend (none exists). `formatConfidentialAmount` returns an in-memory display string only. ✓
- **T-03-02 (Elevation):** `useAllow([tokenAddress])` scopes the permit to the specific token being revealed — not a wildcard; reused, not broadened. ✓
- **T-03-03 (DoS/UX):** settle effect flips stage to `error` via `toDecryptError` on failure; zero-handle / NoCiphertext short-circuits to `0` — never an infinite spinner. ✓
- **T-03-SC (Tampering/installs):** no package installs this plan. ✓

## Known Stubs

The idle ciphertext value in `PairCardDecrypt` renders a display-only mono string derived from the confidential token address (`0x{addr.slice(2,14)}`) purely as the blurred "encrypted" visual — it is decorative and is replaced by the real decrypted cleartext on reveal. This is intentional (the on-chain handle is opaque until decrypt) and does not block the plan goal; the revealed value is the real `useConfidentialBalance` cleartext.

## Notes for Downstream Phases

- `useUserDecrypt` is the shared engine for the 03-03 paste-an-address panel (`DecryptStateBox`) and for Phases 4/5 wrap/unwrap result surfaces — it exposes `{ stage, reveal, reset, value, error, hasPermit, isFetching, decimals }`.
- Open Question 2 (whether `useConfidentialBalance` self-prompts without `useAllow`) is handled by driving the permit explicitly via `useAllow` first for a deterministic `signing` stage; confirm on the live URL in 03-03.
- Assumption A1 (exact no-ACL error class) is safe: `toDecryptError` catch-all on `ZamaError` renders the graceful "NO DECRYPTION ACCESS" state regardless of the concrete subclass.

## Self-Check: PASSED

- All 6 created files present on disk.
- All 3 task commits (49dbc37 test-RED, 7c76aab feat-GREEN, d5e10ac feat) present in git history.
