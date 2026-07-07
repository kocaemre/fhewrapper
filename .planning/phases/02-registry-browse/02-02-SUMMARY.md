---
phase: 02-registry-browse
plan: 02
subsystem: ui
tags: [engraving, theming, next-font, next-themes, self-hosted-assets, coep, registry, erc7984]

# Dependency graph
requires:
  - phase: 02-registry-browse
    plan: 01
    provides: "useRegistryPairs data engine, iconFor()/normalizeSymbol/truncateAddress, minimal PairCard/PairGrid, RegistryPair types"
  - phase: 01-foundation-deploy-spike
    provides: "client-only FHE provider tree, ChainGuard (Sepolia gate), COOP/COEP require-corp headers, next-themes + RainbowKit theming"
provides:
  - "Cellar Registry engraving look: parchment (light default) + cellar (dark) CSS-variable themes mapped onto next-themes data-theme"
  - "Self-hosted, web-optimized assets: 7 cToken icons (<35KB each, 128px) + hero (1.56MB, 1152px) under public/ (COEP-safe)"
  - "Gelasio + JetBrains Mono self-hosted via next/font (Telegraf removed)"
  - "Engraving atoms: TokenIcon (monogram fallback), PairBadge, AddressCopyButton (clipboard + toast), RegistryHero (live pairCount)"
  - "Full engraving PairCard: both-network copyable addresses, per-side decimals, valid/revoked badge, inert Wrap CTA"
affects: [02-03 search-filter, 04-wrap, 05-unwrap]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "next-themes value-map: theme KEYS stay light/dark (RainbowKit resolvedTheme untouched), applied data-theme value maps to parchment/cellar"
    - "Self-host + downscale generated media via sips before shipping (bundle + COEP require-corp)"
    - "next/font self-hosts Google Fonts at build → same-origin → COEP-safe (never a cross-origin <link>)"
    - "Engraving components consume CSS custom props scoped to [data-theme]; hover-lift via React state (inline-style safe)"

key-files:
  created:
    - packages/nextjs/public/icons/cusdc.png
    - packages/nextjs/public/icons/cusdt.png
    - packages/nextjs/public/icons/cweth.png
    - packages/nextjs/public/icons/cbron.png
    - packages/nextjs/public/icons/czama.png
    - packages/nextjs/public/icons/ctgbp.png
    - packages/nextjs/public/icons/cxaut.png
    - packages/nextjs/public/01-hero.png
    - packages/nextjs/components/registry/TokenIcon.tsx
    - packages/nextjs/components/registry/PairBadge.tsx
    - packages/nextjs/components/registry/AddressCopyButton.tsx
    - packages/nextjs/components/registry/RegistryHero.tsx
  modified:
    - packages/nextjs/app/layout.tsx
    - packages/nextjs/styles/globals.css
    - packages/nextjs/components/registry/PairCard.tsx
    - packages/nextjs/components/registry/PairGrid.tsx
    - packages/nextjs/app/page.tsx

key-decisions:
  - "Fonts via next/font/google (self-hosted at build) instead of the plan's literal cross-origin Google Fonts <link> — a cross-origin <link> is BLOCKED under COEP require-corp (CLAUDE.md gotcha, T-02-05). Correctness deviation."
  - "next-themes mapped via `value={{ light: 'parchment', dark: 'cellar' }}` in layout.tsx only — keeps resolvedTheme keys light/dark so DappWrapperWithProviders RainbowKit theming needs no change (avoided touching a non-plan file)."
  - "No address→icon override map needed — all 7 branded *Mock symbols resolve exactly via iconFor() to existing files (verified)."
  - "Hero shipped as PNG at 1152px/1.56MB (85% reduction from 9.9MB source) — only the icons have a hard <200KB gate; hero honored the named artifact (01-hero.png) + 'compressed' requirement."

requirements-completed: [REG-04, REG-06]

coverage:
  - id: D1
    description: "7 branded cTokens display self-hosted engraving icons; missing-icon pairs show a monogram tile (never a broken img)"
    requirement: "REG-04"
    verification:
      - kind: automated
        ref: "iconFor() resolves all 7 *Mock symbols to existing public/icons files (node check); TokenIcon onError → monogram fallback"
        status: pass
      - kind: manual_procedural
        ref: "connect Sepolia wallet on live/local URL; confirm 7 branded icons render + 2 non-branded pairs show monograms"
        status: unknown
    human_judgment: true
    rationale: "In-browser render is wallet-gated (ChainGuard) — automated confirms resolution + fallback path, not the visual"
  - id: D2
    description: "Each pair card shows both ERC-20 + ERC-7984 addresses (copyable + toast), per-side decimals, valid/revoked badge in the engraving theme"
    requirement: "REG-06"
    verification:
      - kind: automated
        ref: "npm run check-types + npm run lint + npm run build all exit 0; PairCard renders both AddressCopyButton rows, PairBadge, per-side decimals"
        status: pass
      - kind: manual_procedural
        ref: "live URL: click each address → clipboard write + 'Copied' toast; revoked card dims + Unavailable CTA"
        status: unknown
    human_judgment: true
    rationale: "Clipboard + toast + hover fidelity are visual/manual per 02-VALIDATION"
  - id: D3
    description: "App renders in Gelasio + JetBrains Mono; parchment (default) + cellar themes driven entirely by CSS custom properties"
    requirement: "REG-04, REG-06"
    verification:
      - kind: automated
        ref: "next/font self-hosts both fonts (build clean); parchment/cellar var blocks scoped to [data-theme]; Telegraf link removed"
        status: pass
    human_judgment: false
  - id: D4
    description: "No Phase-1 regression: client-only provider tree, COOP/COEP require-corp, ChainGuard intact; no @zama-fhe import; no cross-origin media; existing tests green"
    verification:
      - kind: automated
        ref: "grep: no @zama-fhe in registry/layout/page; no https:// media/font refs; COEP require-corp intact in next.config; npx vitest run 17/17 pass"
        status: pass
    human_judgment: false

# Metrics
duration: 19min
completed: 2026-07-07
status: complete
---

# Phase 02 Plan 02: Cellar Registry Engraving Look Summary

**Dressed the working 02-01 registry slice in the locked Cellar Registry engraving design — self-hosted + web-optimized cToken icons/hero, Gelasio + JetBrains Mono via next/font, parchment/cellar CSS-variable themes on next-themes, and the full engraving PairCard (copyable both-network addresses, per-side decimals, valid/revoked badge, inert Wrap CTA) + hero banner with live pair count.**

## Performance
- **Duration:** ~19 min
- **Started:** 2026-07-07T16:17:44Z
- **Completed:** 2026-07-07T16:37:16Z
- **Tasks:** 3 (all `type=auto`, autonomous)
- **Files:** 12 created / 5 modified

## Accomplishments
- **Self-hosted + optimized media (REG-04, DIF-02):** resized/compressed the 7 fal.ai cToken icons from ~2MB/1024px to 128px, **28–34KB each** (well under the 200KB gate) via `sips`, into `public/icons/` with the exact `iconFor()` basenames. Downscaled `01-hero.png` from **9.9MB → 1.56MB** (1152px). All same-origin → survives COEP `require-corp`.
- **Icon resolution verified:** all 7 branded `*Mock` confidential symbols resolve exactly through `iconFor()` to existing files — **no override map required** (RESEARCH Open Question 2 closed).
- **Fonts (self-hosted):** swapped Telegraf → **Gelasio** (400/500/600/700 + italic) + **JetBrains Mono** via `next/font/google` (self-hosts at build → same-origin, COEP-safe). Body font stack + 15.5px/1.55 base set in globals.css.
- **Themes:** transcribed the full parchment + cellar CSS-variable sets (`--bg/--panel/--ink/--muted/--faint/--line*/--red*/--blue*/--green*/--block*/--shadow`) + `inkPulse`/`toastIn` keyframes verbatim from the `.dc.html`. Mapped onto next-themes via `value={{ light: 'parchment', dark: 'cellar' }}` so `data-theme` becomes parchment (default)/cellar while RainbowKit's `resolvedTheme === 'dark'` stays intact.
- **Engraving atoms:** `TokenIcon` (46px self-hosted img, monogram fallback on error), `PairBadge` (valid/revoked pill), `AddressCopyButton` (truncated addr + `⧉`, clipboard write + `Copied` toast, blue confidential variant), `RegistryHero` (self-hosted banner, transcribed copy, hover-lift, live `pairCount`).
- **Full PairCard:** icon + `cSymbol ⇄ symbol` + italic name + badge → dashed divider → ERC-20 + ERC-7984 (blue) copy rows → dashed divider → per-side decimals (Pitfall 4) + inert `Wrap →` CTA (revoked → dim + `Unavailable`). Wired `RegistryHero` above the grid in `page.tsx` with `pairCount={validCount}`.

## Task Commits
1. **Task 1: assets + fonts + themes** — `f450ca2` (feat)
2. **Task 2: engraving atoms** — `2292080` (feat)
3. **Task 3: full PairCard + hero wiring** — `ab70446` (feat)

## Files Created/Modified
- `public/icons/{cusdc,cusdt,cweth,cbron,czama,ctgbp,cxaut}.png` — optimized self-hosted icons
- `public/01-hero.png` — downscaled hero banner
- `app/layout.tsx` — next/font (Gelasio + JetBrains Mono), next-themes parchment/cellar value-map, Telegraf link removed
- `styles/globals.css` — parchment/cellar CSS-var blocks, keyframes, engraving body font + focus ring
- `components/registry/TokenIcon.tsx` / `PairBadge.tsx` / `AddressCopyButton.tsx` / `RegistryHero.tsx` — engraving atoms (new)
- `components/registry/PairCard.tsx` — upgraded minimal → full engraving card
- `components/registry/PairGrid.tsx` — aligned to UI-SPEC minmax(350px)/gap 18
- `app/page.tsx` — hero + engraving-styled loading/error/empty under ChainGuard

## Decisions Made
- **Fonts via next/font, not a cross-origin `<link>`** — see Deviations (COEP correctness).
- **next-themes value-map in layout.tsx only** — parchment/cellar without touching DappWrapperWithProviders (RainbowKit `resolvedTheme` keys unchanged).
- **Hero overlay text colors fixed to the parchment palette** (dark ink over the always-light engraving art) per the source — intentionally does not follow the cellar theme so copy stays legible; only the hero border/shadow follow theme vars.
- **Hero kept as PNG** at 1152px (honors the named `01-hero.png` artifact + "compressed"); icons are the only assets with a hard <200KB gate.

## Deviations from Plan

### Auto-fixed / Correctness

**1. [Rule 2 - Correctness] Fonts loaded via next/font instead of a cross-origin Google Fonts `<link>`**
- **Found during:** Task 1
- **Issue:** The plan/UI-SPEC say "load Gelasio + JetBrains Mono via a Google Fonts `<link>`". Under the active COEP `require-corp` header (Phase 1, `next.config.ts`), a cross-origin stylesheet from `fonts.googleapis.com` + font files from `fonts.gstatic.com` are **blocked** — fonts would silently fail to load on the live URL. CLAUDE.md explicitly mandates `next/font` for exactly this reason (T-02-05 / DIF-02).
- **Fix:** Used `next/font/google` for both families (self-hosts at build → same-origin). Removed the Telegraf `<link>` and the plan's proposed Google Fonts `<link>`; applied font CSS variables on `<html>` and referenced them in the body font stack.
- **Files modified:** `app/layout.tsx`, `styles/globals.css`
- **Verification:** `npm run build` self-hosts the fonts; no `https://` font refs remain (grep clean).
- **Committed in:** `f450ca2`

**2. [Rule 2 - Fidelity] PairGrid aligned to UI-SPEC grid tokens**
- **Found during:** Task 3
- **Issue:** 02-01's `PairGrid` used `minmax(320px)`/`gap:16`; UI-SPEC specifies `minmax(350px, 1fr)`/`gap:18`.
- **Fix:** Updated the two grid values (PairGrid was not in the plan's Task 3 file list but is the correct home for the grid contract).
- **Committed in:** `ab70446`

**Total deviations:** 2 (both correctness/fidelity, no scope creep). No architectural changes.

## Known Stubs
- **`Wrap →` CTA is intentionally inert** (`onClick={undefined}`) — wrap ships in **Phase 4**. The CTA remains visible per the locked design (UI-SPEC Interaction Contract). Not a data stub; documented as intended deferral.
- Search/filter, `PairCardSkeleton`, and `RegistryError`/`RegistryEmpty` full components are **02-03** scope — this plan uses minimal engraving-styled loading/error/empty fallbacks in `page.tsx`.

## Issues Encountered
- Pre-existing non-fatal build warning: `@react-native-async-storage/async-storage` "Module not found" from the MetaMask SDK (RainbowKit/wagmi connectors, Phase-1 provider tree). Out of scope; build exits 0. Logged as pre-existing (also noted in 02-01), not fixed.

## User Setup Required
None — all assets self-hosted, no external service configuration.

## Next Phase Readiness
- Engraving card + hero + atoms ready for **02-03** (client-side search + valid/revoked filter, skeleton, RPC-error retry banner).
- `AddressCopyButton`, `PairBadge`, `TokenIcon` are reusable atoms for the Phase 4/5 wrap/unwrap + decrypt panels.
- Theme mechanism (parchment/cellar via next-themes) established; future screens inherit the CSS vars automatically.

## Self-Check: PASSED
- All created files verified present on disk (icons, atoms, globals.css, layout.tsx, PairCard.tsx)
- Commits verified in git log (f450ca2, 2292080, ab70446)
- `check-types` exit 0, `lint` clean, `build` exit 0, `vitest` 17/17 pass
- No `@zama-fhe` import, no cross-origin media/font refs, COEP `require-corp` intact

---
*Phase: 02-registry-browse*
*Completed: 2026-07-07*
