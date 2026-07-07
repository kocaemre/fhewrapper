---
phase: 03-user-decryption-eip-712
plan: 02
subsystem: user-decryption
status: complete
tags: [fhe, eip-712, user-decryption, paste-an-address, erc-165, blur-reveal, tdd]
dependency_graph:
  requires:
    - "03-01: useUserDecrypt shared engine (stage/reveal/reset/value/error/hasPermit/decimals)"
    - "03-01: lib/decryptErrors (toDecryptError) + lib/formatConfidential (formatConfidentialAmount)"
    - "03-01: .cipher-blur / .reveal-num blur→reveal CSS keyframes"
    - "Phase 1: ChainGuard (connection + Sepolia gate); DappWrapperWithProviders FHE tree"
  provides:
    - "lib/decryptValidate — validateDecryptTarget (format trust gate, test-locked)"
    - "components/decrypt/DecryptAddressInput / DecryptStateBox / DecryptCTA (paste-panel atoms)"
    - "components/decrypt/DecryptPanel — composed paste→validate→ERC-165→decrypt flow"
    - "app/decrypt — ChainGuard-gated /decrypt route"
  affects:
    - "03-03 consumes DecryptPanel (adds hero art, quick-pick chips, permit indicator, Header nav)"
tech_stack:
  added: []
  patterns:
    - "Two-stage trust boundary: viem isAddress/getAddress (format) → useIsConfidential ERC-165 (on-chain) BEFORE any relayer call (T-03-04)"
    - "Conditional-invocation via enabled flag on a zeroAddress placeholder (W2 non-empty-tuple avoidance, same as 03-01)"
    - "useMetadata for pasted-token decimals/symbol — never hardcode 18 (Pitfall 5)"
    - "Single reusable permit (03-01 useAllow) → 'Decrypt' skip on cached permit (DEC-03)"
key_files:
  created:
    - packages/nextjs/lib/decryptValidate.ts
    - packages/nextjs/lib/decryptValidate.test.ts
    - packages/nextjs/components/decrypt/DecryptAddressInput.tsx
    - packages/nextjs/components/decrypt/DecryptStateBox.tsx
    - packages/nextjs/components/decrypt/DecryptCTA.tsx
    - packages/nextjs/components/decrypt/DecryptPanel.tsx
    - packages/nextjs/app/decrypt/page.tsx
  modified: []
decisions:
  - "validateDecryptTarget covers FORMAT only (trim/empty/isAddress/getAddress checksum); the ERC-165 confidential check is a hook (useIsConfidential) exercised in DecryptPanel, not pure-testable — so the test suite locks exactly what is deterministic."
  - "useIsConfidential + useMetadata called unconditionally on `validAddr ?? zeroAddress` and gated by `enabled` (ok / ok && isConf===true) — mirrors the 03-01 W2 pattern; no relayer/RPC fires on the placeholder."
  - "DecryptStateBox reuses the 03-01 NoCiphertext→0 rule: a NoCiphertext failure renders as a revealed 0, not an error (DEC-04)."
  - "Empty-address is surfaced as the CTA label 'Enter an ERC-7984 address' (disabled), not a red input-error row — only malformed/non-confidential show the red reason row (avoids shouting at an untouched field)."
  - "Header 'Decrypt' nav route deferred to 03-03: Header.tsx currently has no nav paradigm (wallet button only); introducing one is out of this plan's file scope and belongs with the 03-03 panel finalization."
metrics:
  duration_min: 24
  completed: 2026-07-07
  tasks: 3
  files_changed: 7
  tests: 55
---

# Phase 3 Plan 02: Paste-an-Address "Any Token" Decrypt Summary

A dedicated `/decrypt` screen where a connected Sepolia wallet pastes ANY ERC-7984 address, passes a two-stage trust gate (viem format check → on-chain ERC-165 confidential-token check), signs one reusable EIP-712 permit, and reveals its confidential balance with the shared 03-01 blur→reveal engine — a cached permit from a registry card decrypts the pasted token without re-signing (DEC-02/DEC-03/DEC-04).

## What Was Built

**Task 1 — test-locked pasted-address validation (RED→GREEN):**
- `lib/decryptValidate.ts` — `validateDecryptTarget(raw)` → `{ ok, address?, reason? }`. Trims input; empty → `Enter an ERC-7984 address`; viem `isAddress` false → `NOT A VALID ADDRESS`; otherwise returns `getAddress(trimmed)` (EIP-55 checksum). This is the FIRST trust-boundary gate (T-03-04) — format only; the on-chain ERC-165 check is downstream.
- `lib/decryptValidate.test.ts` — 12 cases (empty/whitespace ×4, malformed ×5, lowercase→checksum, already-checksummed unchanged, trim-around-valid). Committed RED (`832611a`, module-not-found) before GREEN (`cfa397d`).

**Task 2 — three presentational atoms:**
- `DecryptAddressInput` — controlled mono input (JetBrains Mono 13.5px, `1.5px --line-soft` border, `--bg2` fill, focus→`--blue`), field label `ERC-7984 TOKEN ADDRESS`, and a red `--red` reason row when the parent passes one. Parent owns validation.
- `DecryptStateBox` — `2px --blue-line` box; per-stage mono chip (idle ◈ blue / signing ✎ red / decrypting ◌ red / revealed ✓ green / error ✕ red). Body: blurred mock ciphertext (`.cipher-blur`) while idle/in-flight; 36px `--red` cleartext + 17px `--blue` symbol + local-only caption on reveal (`.reveal-num`); typed `toDecryptError` chip/body on error. NoCiphertext→revealed `0` (DEC-04). Reuses 03-01 `formatConfidentialAmount` (decimals-driven).
- `DecryptCTA` — `2px --line` Gelasio button, enabled `--block`/`--block-fg`, disabled `--panel2`/`--faint`. Label state machine: not-connected → busy(signing/decrypting) → revealed(`Decrypt another`) → token-not-ready(`Enter an ERC-7984 address`) → permit-active(`Decrypt`, DEC-03) → default(`Sign & Decrypt (EIP-712)`).

**Task 3 — composed panel + route:**
- `DecryptPanel` — design-verbatim `<section max-width 880>` with centered `Reveal a <em blue 500>confidential</em> balance` header, then a `minmax(200px,260px) 1fr` grid (`2px --line` + hard `--shadow`). Left: engraving illustration placeholder (`--panel2`, `border-right 2px --line`, min-height 420 — hero art added in 03-03). Right: `--panel` column composing input → state box → CTA → footer reassurance. Logic: `validateDecryptTarget(raw)` → `useIsConfidential(validAddr ?? zeroAddress, { enabled: ok })` → `useMetadata(…, { enabled: ok && isConf })` → `useUserDecrypt(confirmedConfidential ? validAddr : undefined, { decimals })`. A valid-but-non-ERC-7984 shows `NOT A CONFIDENTIAL (ERC-7984) TOKEN` and keeps the CTA disabled; a "checking token on-chain…" hint shows while the ERC-165/metadata reads resolve.
- `app/decrypt/page.tsx` — client route wrapping `DecryptPanel` in the Phase-1 `ChainGuard` (connection + Sepolia required for this write-ish path), inside the existing FHE provider tree (`max-width 1180` shell mirroring `app/page.tsx`).

## Verification Results

- `npm run check-types` — exit 0.
- `npm run lint` — exit 0 (prettier auto-applied; no warnings/errors after format).
- `npx vitest run` — **55 tests / 7 files** green (43 pre-existing + 12 new `decryptValidate`).
- `npm run build` — exit 0; `/decrypt` emitted as a static route (3.55 kB). Only the pre-existing `@metamask/sdk` optional-dep `async-storage` warning (carried from 03-01, unrelated).
- No `useGrantPermit` / `useHasPermit` / `useDecryptValues` anywhere (verified absent) — only installed exact-3.0.0 symbols (`useIsConfidential`, `useMetadata`, plus the 03-01 engine).
- Live in-browser relayer-dependent decrypt (paste→sign→reveal end-to-end) is verified at the 03-03 phase-gate checkpoint on the deployed URL.

## Deviations from Plan

None — plan executed as written. (The Header `Decrypt` nav link named in 03-UI-SPEC is intentionally NOT in this plan's `files_modified`; deferred to 03-03 — see Decisions.)

## Threat Model Coverage

- **T-03-04 (Tampering — pasted address):** two ordered gates before the engine — viem `isAddress`+`getAddress` (format) then `useIsConfidential` ERC-165 (on-chain). `decryptAddr` is `undefined` unless BOTH pass, so a malformed or valid-but-non-ERC-7984 input never reaches `useUserDecrypt`/the relayer. ✓
- **T-03-01 (Info Disclosure — cleartext):** revealed value lives only in React state; caption states it never leaves the session; no backend receives it; nothing broadcast on-chain. ✓
- **T-03-03 (DoS/UX):** reuses the 03-01 4-stage settle machine; failures resolve to a typed ✕ chip via `toDecryptError`; the panel is `ChainGuard`-gated so wrong-network never hangs (DEC-04). ✓
- **T-03-SC (installs):** no package installs — reuses exact-pinned 3.0.0 SDKs. ✓

## Known Stubs

- **Left illustration column (DecryptPanel):** a decorative `--panel2` placeholder with no image — the self-hosted `bottle-hero` art, quick-pick chips, and permit indicator are explicitly deferred to 03-03 by the plan. Does not block DEC-02/03/04 (the form column is fully functional).
- **MOCK_HANDLE (DecryptStateBox):** a fixed mono string rendered blurred as the "encrypted ciphertext" visual while idle/in-flight — decorative only; the real `useConfidentialBalance` cleartext replaces it on reveal (same intentional pattern as 03-01 `PairCardDecrypt`).

## Notes for Downstream Phases

- **03-03** consumes `DecryptPanel` and should: copy `bottle-hero.png` into `public/` and fill the left column; add `DecryptQuickPicks` (connected wallet's registry cTokens) + `PermitIndicator`; add the `Decrypt` nav link to `Header.tsx`; and run the live paste→sign→reveal proof on the deployed URL (DEC-02/03/04 end-to-end).
- The single-permit DEC-03 skip is wired: `hasPermit` from `useUserDecrypt` drives the CTA to `Decrypt` (no re-sign). Confirm the cross-path cache (registry card → paste panel) on the live URL.

## Self-Check: PASSED

- All 7 created files present on disk.
- All 4 task commits present in git history: `832611a` (test-RED), `cfa397d` (feat-GREEN), `f75f76a` (atoms), `cd75be2` (panel+route).
