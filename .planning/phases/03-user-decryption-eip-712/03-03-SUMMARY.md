---
phase: 03-user-decryption-eip-712
plan: 03
subsystem: user-decryption
status: complete
tags: [fhe, eip-712, user-decryption, registry-quick-picks, permit-indicator, hero-art, nav]
dependency_graph:
  requires:
    - "03-01: useUserDecrypt shared engine + useAllow/useIsAllowed permit path"
    - "03-02: DecryptPanel (paste→validate→ERC-165→decrypt) + /decrypt route"
    - "Phase 2: useRegistryPairs (valid registry pairs) + normalizeSymbol"
    - "Phase 1: DIF-02 self-hosted same-origin asset pattern (COEP require-corp)"
  provides:
    - "components/decrypt/DecryptQuickPicks — valid-registry cToken chips as one-click decrypt targets (DEC-02 registry entry point)"
    - "components/decrypt/PermitIndicator — VIEWING KEY ACTIVE badge via useIsAllowed (DEC-03)"
    - "public/02-bottle-hero.png — self-hosted, optimized decrypt hero illustration"
    - "Header Decrypt/Registry nav (usePathname active-route underline)"
  affects:
    - "Phase 4/5 wrap/unwrap surfaces can reuse the same permit-indicator + engine pattern"
    - "Live-URL decrypt proof deferred to end-of-project manual UAT (03-UAT.md)"
tech_stack:
  added: []
  patterns:
    - "Registry-token entry point: chips sourced from the SAME Phase-2 useRegistryPairs (valid only, deduped by confidential address); paste input remains the always-available 'any token' path"
    - "useIsAllowed (verified 3.0.0) drives the cached-permit badge; W2 non-empty-tuple avoided via zeroAddress placeholder + real-address gate (same as the 03-01 engine)"
    - "Self-hosted optimized PNG under public/ (same-origin survives COEP require-corp); no cross-origin media"
    - "usePathname active-route theming (--red underline) in the Header nav; connect cluster stays right-aligned"
key_files:
  created:
    - packages/nextjs/components/decrypt/DecryptQuickPicks.tsx
    - packages/nextjs/components/decrypt/PermitIndicator.tsx
    - packages/nextjs/public/02-bottle-hero.png
  modified:
    - packages/nextjs/components/decrypt/DecryptPanel.tsx
    - packages/nextjs/components/Header.tsx
decisions:
  - "Hero shipped as optimized PNG (295x440, 277KB) NOT WebP: the plan's files_modified, automated verify (test -f public/02-bottle-hero.png) and <img src=\"/02-bottle-hero.png\"> all pin the .png filename; no lossy PNG compressor (pngquant/oxipng) is installed, so 277KB is the practical PNG floor at usable retina dimensions for the ~260px column (38x smaller than the 10.6MB source, ~6x smaller than Phase-2's shipped 1.6MB hero). A WebP would be ~104KB — see Deviations."
  - "PermitIndicator sits on its own right-aligned row ABOVE the full-width CTA (not inline beside it): DecryptCTA is width:100%, so a same-row flex would squeeze the button. Reads as 'next to the CTA' contextually without breaking layout."
  - "Header gained BOTH a Registry (/) and a Decrypt (/decrypt) link, not Decrypt alone: the plan's active-route underline via usePathname only has meaning with >1 route, and a lone Decrypt link would strand users with no way back to the registry. Both themed in the Gelasio engraving idiom; connect cluster untouched (navbar-end)."
  - "Quick-picks target the confidential (ERC-7984) side of each valid pair and set the panel address, then reset the engine to idle so the freshly-picked token starts clean; the picked address flows through the SAME two-stage trust gate (format → ERC-165) as a pasted one."
metrics:
  duration_min: 22
  completed: 2026-07-07
  tasks: 2
  files_changed: 5
  tests: 55
---

# Phase 3 Plan 03: Decrypt UX Finalization (Quick-Picks + Permit Indicator + Hero + Nav) Summary

Finishes the decrypt feature UX: the `/decrypt` panel now offers the connected wallet's **registry cToken quick-picks** as one-click decrypt targets (the registry entry point alongside paste-an-address), shows a **VIEWING KEY ACTIVE** badge once a permit is cached, renders a **self-hosted engraving hero**, and is reachable from a themed **Header Decrypt nav** link. All on the verified exact-3.0.0 SDK hooks, gates green. The relayer-dependent live-URL decrypt proof (which cannot be shown by unit tests) is deferred to a single end-of-project manual session — see `03-UAT.md`.

## What Was Built

**Task 1 — quick-picks, permit indicator, hero art, Decrypt nav (commit `5409f68`):**

- **`DecryptQuickPicks.tsx`** — `{ onPick, selected }`. Reads the SAME Phase-2 `useRegistryPairs()` that powers the registry browse; renders VALID pairs' confidential tokens as mono chips `◈ {cSymbol}` (symbol via `normalizeSymbol`, e.g. `cUSDCMock` → `cUSDC`), deduped by confidential address (onchain+local overlap). `padding 7px 13px`, JetBrains Mono 12px/600, `flex-wrap` with an italic `--faint` "or pick:" hint. Clicking a chip calls `onPick(pair.confidential.address)`; the selected chip gets a `--blue` border + `--blue-dim` fill. Renders nothing while the list is empty/loading — the paste input stays the always-available entry point. This is the **DEC-02 registry entry point** proving "any registry token", complementing the paste path for "any ERC-7984".
- **`PermitIndicator.tsx`** — `{ address }`. Reads verified `useIsAllowed({ contractAddresses: [address ?? zeroAddress] })`; renders a small green mono `◈ VIEWING KEY ACTIVE` badge (10.5px/700, uppercase, `letter-spacing 0.14em`, `--green`) ONLY when a real `address` is set AND `data === true`. Hidden otherwise (and never for the zero placeholder). W2 non-empty-tuple avoided via the `zeroAddress` placeholder + real-address gate — mirrors the 03-01 engine. This is the **DEC-03 permit-status indicator**.
- **`DecryptPanel.tsx` (modified)** — left column placeholder replaced with `<img src="/02-bottle-hero.png">` (`object-fit cover`, `min-height 420`, decorative alt "Engraved bottle, wax-sealed, with a scroll inside"). Right column: `DecryptQuickPicks` added below the address input (`onPick` sets the panel address + resets to idle; `selected={validAddr}`); `PermitIndicator` on a right-aligned row just above the CTA (`address={decryptAddr}` — the resolved, confirmed-confidential address). All 03-02 panel logic (two-stage trust gate, `useIsConfidential`/`useMetadata`, engine wiring) intact.
- **`Header.tsx` (modified)** — Registry (`/`) + Decrypt (`/decrypt`) nav links in the `navbar-start` region, Gelasio engraving idiom, active route → `--red` underline via `usePathname` (`/` exact-match, others `startsWith`). The existing right-aligned RainbowKit connect cluster (`navbar-end`) is untouched, so the connect button stays pinned right with its responsive gutter.
- **`public/02-bottle-hero.png`** — the design's `.planning/design/assets/02-bottle-hero.png` (10.6MB, 1696×2528) resized via `sips` to 295×440 (277KB) and self-hosted under `public/` (same-origin — survives COEP `require-corp`; DIF-02).

## Verification Results

- `test -f public/02-bottle-hero.png` — present (276,915 bytes).
- `npm run check-types` — exit 0.
- `npm run lint` — exit 0 (no ESLint warnings/errors).
- `npx vitest run` — **55 tests / 7 files** green (no regression; this plan adds UI wiring, not new pure logic, so no new unit tests).
- `npm run build` — exit 0; `/decrypt` static route (3.5 kB). Only the pre-existing `@metamask/sdk` optional-dep `async-storage` warning (carried from 03-01/02, unrelated).
- **Forbidden-hook scan clean:** no `useGrantPermit` / `useHasPermit` / `useDecryptValues` anywhere. Only verified installed exact-3.0.0 symbols used — `useIsAllowed` (new this plan), plus the reused `useRegistryPairs` (wagmi) and the 03-01/02 engine (`useAllow`, `useIsAllowed`, `useConfidentialBalance`, `useIsConfidential`, `useMetadata`).

## Deviations from Plan

**1. [Rule 3 — asset format] Hero shipped as optimized PNG, not WebP.**
- **Found during:** Task 1 (asset optimization).
- **Issue:** Critical guidance requested WebP well under ~250KB, but the plan's `files_modified`, the automated verify (`test -f public/02-bottle-hero.png`), and the `<img src="/02-bottle-hero.png">` all pin the `.png` filename. Converting to WebP would break the automated verify gate.
- **Fix:** Kept the `.png` filename (honoring the plan's hard gate) and optimized aggressively via `sips` — 295×440, **277KB** (38× smaller than the 10.6MB source, ~6× smaller than Phase-2's shipped 1.6MB hero). No lossy PNG compressor (`pngquant`/`oxipng`/`zopflipng`) is installed on this machine, so 277KB is the practical PNG floor at usable retina dimensions for the ~260px-wide column. For reference, `cwebp -q 80` at the same height produces ~104KB — a future optimization if the `.png` filename constraint is relaxed.
- **Files:** `packages/nextjs/public/02-bottle-hero.png`.
- **Commit:** `5409f68`.

**2. [Rule 2 — navigation coherence] Header gained a Registry link too, not only Decrypt.**
- **Found during:** Task 1 (Header nav).
- **Issue:** The plan scoped "a Decrypt nav link" with an active-route underline via `usePathname`. A single link makes the active-route logic meaningless and leaves `/decrypt` visitors with no in-header way back to the registry.
- **Fix:** Added both Registry (`/`) and Decrypt (`/decrypt`) links, themed identically; the active route is underlined `--red`. Connect cluster untouched.
- **Files:** `packages/nextjs/components/Header.tsx`.
- **Commit:** `5409f68`.

## Live-URL Phase Gate — DEFERRED (not a blocker)

Per the end-of-project directive (time-boxed), the blocking live-URL decrypt checkpoint is **deferred to a single manual UAT session at the end of the project**, NOT run now. The full step list (DEC-01 registry decrypt, DEC-02/03 paste + single-signature reuse, DEC-04 no-ACL/zero/bad-address graceful states, and recording the concrete no-ACL error class for RESEARCH Open Question 1) is captured in `.planning/phases/03-user-decryption-eip-712/03-UAT.md` with status `pending`.

**RESEARCH Open Question 1 (no-ACL error class) — code is ready, live class pending capture:** `lib/decryptErrors.toDecryptError` already maps the no-ACL group — `matchAclRevert(e) || e instanceof DecryptionFailedError || e instanceof RelayerRequestFailedError` — to the graceful `NO DECRYPTION ACCESS` state (never a hanging spinner). RESEARCH hypothesizes `DecryptionFailedError` or `RelayerRequestFailedError`; the live UAT records which concrete class the relayer actually throws.

## Threat Model Coverage

- **T-03-05 (Spoofing — EIP-712 prompt):** the SDK assembles the canonical `UserDecryptRequestVerification` typed data via `useAllow` (engine); the app never constructs arbitrary sign requests. `PermitIndicator` + the panel footer explain what the signature grants. ✓
- **T-03-06 (DoS/UX — live relayer under require-corp):** the 4-stage engine bounds the wait and surfaces a typed error (DEC-04); the self-hosted hero is same-origin so it never trips isolation. Live proof deferred to `03-UAT.md`. ◐ (code ready, live check deferred)
- **T-03-01 (Info Disclosure — cleartext):** revealed value stays in React state; nothing broadcast on-chain or sent to a backend (none exists). ✓
- **T-03-SC (Tampering — installs/asset):** no package installs; the only new artifact is a same-origin PNG copied from the vetted design assets (no cross-origin media under require-corp). ✓

## Known Stubs

None. The `MOCK_HANDLE` blurred-ciphertext visual in `DecryptStateBox` remains an intentional decorative pattern (documented in 03-02), replaced by the real cleartext on reveal.

## Notes for Downstream Phases

- The single reusable permit is now visible end-to-end: grant on a registry card (03-01) → `VIEWING KEY ACTIVE` badge on `/decrypt` (this plan) → paste-token decrypt with NO re-sign (DEC-03). The live cross-path cache proof is in `03-UAT.md`.
- Phase 4/5 wrap/unwrap result surfaces can reuse `PermitIndicator` + the `useUserDecrypt` engine verbatim.
- `03-UAT.md` holds the deferred live-URL checks — run them in one manual session before final submission.

## Self-Check: PASSED

- All 3 created files + 2 modified files present on disk.
- Task 1 commit `5409f68` present in git history.
- Asset `public/02-bottle-hero.png` present (276,915 bytes).
