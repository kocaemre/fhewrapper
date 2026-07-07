---
phase: 02-registry-browse
plan: 03
subsystem: ui
tags: [search, filter, react-query, loading-skeleton, empty-state, error-retry, vitest, registry]

# Dependency graph
requires:
  - phase: 02-registry-browse
    plan: 01
    provides: "useRegistryPairs data engine (pairs/validCount/isLoading/isError/refetch), normalizeSymbol, RegistryPair types, PairGrid/PairCard"
  - phase: 02-registry-browse
    plan: 02
    provides: "Cellar engraving look (parchment/cellar CSS vars, inkPulse keyframe), RegistryHero, engraving atoms, focus ring"
  - phase: 01-foundation-deploy-spike
    provides: "client-only FHE provider tree, ChainGuard (Sepolia gate), COOP/COEP require-corp headers"
provides:
  - "filterPairs(pairs, search, filter): pure, unit-tested client-side search (symbol raw+normalized, name, both addresses) AND valid/revoked chip"
  - "RegistryToolbar: controlled search input + ALL/VALID/REVOKED chip group (active = --block inverse fill)"
  - "PairCardSkeleton: PairCard-shaped loading placeholder with reduced-motion-safe inkPulse; page renders a grid of 6"
  - "RegistryEmpty: no-match (echoes query, React-escaped) vs no-pairs copy per the Copywriting Contract"
  - "RegistryError: red inline retry banner whose Retry re-runs the multicall reads via react-query refetch"
affects: [04-wrap, 05-unwrap]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Lift search/filter state to the page; derive the visible list with useMemo(filterPairs) — pure function stays unit-testable"
    - "State branching on the data hook: isLoading -> skeleton grid; isError -> RegistryError(refetch); resolved+0 -> RegistryEmpty; else -> PairGrid"
    - "Decorative motion (inkPulse skeleton) gated behind prefers-reduced-motion in globals.css, never inline"
    - "Untrusted search echo rendered as a React string child (default escaping), never dangerouslySetInnerHTML (T-02-01)"

key-files:
  created:
    - packages/nextjs/lib/filterPairs.ts
    - packages/nextjs/lib/filterPairs.test.ts
    - packages/nextjs/components/registry/RegistryToolbar.tsx
    - packages/nextjs/components/registry/PairCardSkeleton.tsx
    - packages/nextjs/components/registry/RegistryEmpty.tsx
    - packages/nextjs/components/registry/RegistryError.tsx
  modified:
    - packages/nextjs/app/page.tsx
    - packages/nextjs/styles/globals.css

key-decisions:
  - "filterPairs uses relative imports (./tokenSymbol, ../registry/types) to match the other testable lib files — the vitest node config does not resolve the ~~/ alias (fixed after a first RED run failed to import)"
  - "Search haystack includes BOTH the raw *Mock symbol and its normalized display form (normalizeSymbol) so typing either 'usdc' or 'cUSDC' matches"
  - "No debounce — the list is ~9 pairs; instant filtering keeps the empty-state echo exactly in sync with the current query (plan allowed debounce as optional)"
  - "RegistryEmpty keeps to the two contract copies: active search -> no-match echo; otherwise -> no-pairs fallback. A filter-only zero result (e.g. REVOKED when all pairs are valid) shows the no-pairs copy rather than inventing a third string (honors the locked Copywriting Contract)"

requirements-completed: [REG-02]

coverage:
  - id: D1
    description: "Client-side search + valid/revoked filter combine (AND); revoked pairs remain filterable via isValid (never dropped upstream)"
    requirement: "REG-02"
    verification:
      - kind: unit
        ref: "lib/filterPairs.test.ts (10 tests): raw+normalized symbol, name, both addresses, ALL/VALID/REVOKED, AND-combine, no-match, trim (vitest run 27/27)"
        status: pass
      - kind: manual_procedural
        ref: "live/local URL: type symbol/name/address -> list filters live; toggle ALL/VALID/REVOKED"
        status: unknown
    human_judgment: true
    rationale: "Interactive filtering + visual chip states are wallet-gated and visual; automated units lock the pure logic"
  - id: D2
    description: "Loading shows 6 skeleton cards (reduced-motion respected); RPC error shows the red retry banner and Retry re-runs reads; a no-match search shows the empty state echoing the query"
    requirement: "REG-02"
    verification:
      - kind: automated
        ref: "npm run check-types (exit 0); npx eslint on changed files (No issues found); npm run build (exit 0)"
        status: pass
      - kind: manual_procedural
        ref: "live/local URL: mount -> skeleton grid; throttle/deny RPC -> red banner + working Retry; search no-match -> empty copy echoes query"
        status: unknown
    human_judgment: true
    rationale: "Skeleton/empty/error render paths are visual + wallet/RPC-gated per 02-VALIDATION"
  - id: D3
    description: "No Phase-1/02 regression: provider tree, ChainGuard, COOP/COEP, engraving look intact; no @zama-fhe import; existing 17 units still green"
    verification:
      - kind: automated
        ref: "npx vitest run 27/27 (17 existing + 10 new); no @zama-fhe import added; page.tsx still renders under ChainGuard with untouched provider tree"
        status: pass
    human_judgment: false

# Metrics
duration: 33min
completed: 2026-07-07
status: complete
---

# Phase 02 Plan 03: Search + Filter + Data States Summary

**Completed the registry browser interactivity: a pure, unit-tested client-side search (symbol raw+normalized / name / both addresses) plus an ALL/VALID/REVOKED chip that combines with search via AND, and the three data-state screens — a 6-card loading skeleton (reduced-motion-safe), a no-match/no-pairs empty state echoing the query, and an inline red RPC-error retry banner that re-runs the multicall reads.**

## Performance
- **Duration:** ~33 min (much of it a slow/timing-out full-project `npm run lint`; changed-file lint + build were clean)
- **Tasks:** 3 (Task 1 + Task 2 auto/committed; Task 3 is the human-verify checkpoint — pending)
- **Files:** 6 created / 2 modified

## Accomplishments
- **Pure filter engine (`filterPairs`)** — case-insensitive substring across both sides' symbol (raw `*Mock` + `normalizeSymbol` display form), name, and both addresses; the `all`/`valid`/`revoked` chip narrows by `isValid` and combines with search using AND. Revoked pairs stay in the source array so `REVOKED` has data (REG-02 pitfall). Locked by **10 vitest units**.
- **`RegistryToolbar`** — controlled search `<input>` (Gelasio 15px, 1.5px `--line-soft`, placeholder + 0.4 opacity, global `--red` focus ring) and an `ALL`/`VALID`/`REVOKED` chip group (JetBrains Mono; active chip uses the `--block` inverse fill, inactive `--panel`). `margin-bottom:24px`. State lifted to `page.tsx` and combined via `useMemo(filterPairs)`.
- **`PairCardSkeleton`** — mirrors PairCard's layout (icon circle + two identity bars → two address bars → CTA bar) with `--line-faint` fills and the `inkPulse` opacity animation via `.skel-pulse`, which is disabled under `prefers-reduced-motion`. The page renders a grid of 6 while reading.
- **`RegistryEmpty`** — centered italic `--muted`, `padding:60px 0`; active search → the no-match copy echoing the (React-escaped) query, otherwise the rare no-pairs fallback — both verbatim from the Copywriting Contract.
- **`RegistryError`** — inline banner (`--red` border, `--red-dim` bg) with the fixed `The ledger could not be read.` copy (no raw error strings — T-02-03) and a `Retry` button wired to the hook's `refetch` (re-runs the Multicall3 reads).
- **Page wiring** — `isLoading` → skeleton grid; `isError` → `RegistryError`; resolved + 0 visible → `RegistryEmpty(search)`; else → `PairGrid(visible)`. The toolbar renders only once data resolves; the Phase-1 `ChainGuard` + provider tree are untouched.

## Task Commits
1. **Task 1: search + valid/revoked filter toolbar (+ 10 filter units)** — `d187a14` (feat)
2. **Task 2: loading skeleton / empty / RPC-error states wired to react-query** — `ee6dc14` (feat)

## Files Created/Modified
- `lib/filterPairs.ts` (+`.test.ts`) — pure search+filter + 10 units
- `components/registry/RegistryToolbar.tsx` — search input + filter chips (controlled)
- `components/registry/PairCardSkeleton.tsx` — loading placeholder (reduced-motion-safe)
- `components/registry/RegistryEmpty.tsx` — no-match / no-pairs copy
- `components/registry/RegistryError.tsx` — red inline retry banner (refetch)
- `app/page.tsx` — lifted search/filter state, `useMemo(filterPairs)`, state branching
- `styles/globals.css` — search placeholder opacity 0.4 + `.skel-pulse` (reduced-motion guard)

## Decisions Made
- **Relative imports in `filterPairs.ts`** (`./tokenSymbol`, `../registry/types`) — the vitest node env does not resolve the `~~/` alias; the other testable lib files already use relative imports. Caught by a first RED run and fixed.
- **Search haystack includes raw + normalized symbol** so both `usdc` and `cUSDC` match.
- **No debounce** — ~9 pairs; instant filtering keeps the empty-state echo in exact sync (plan allowed debounce as optional).
- **RegistryEmpty stays on the two contract copies** — a filter-only zero result shows the no-pairs fallback rather than inventing a third string (honors the locked Copywriting Contract).

## Deviations from Plan

### Auto-fixed

**1. [Rule 3 - Blocking] filterPairs alias import broke the vitest RED run**
- **Found during:** Task 1
- **Issue:** `filterPairs.ts` initially imported via `~~/lib/tokenSymbol`; the vitest node config resolves no such alias, so the new test suite failed to import (0 tests).
- **Fix:** Switched to relative imports (`./tokenSymbol`, `../registry/types`) — the convention the other tested lib files already use.
- **Files modified:** `lib/filterPairs.ts`
- **Verification:** `npx vitest run` → 27/27 green.
- **Committed in:** `d187a14`

**Total deviations:** 1 (blocking import fix, no scope change). No architectural changes.

## Known Stubs
- **`Wrap →` CTA remains inert** (carried from 02-02) — wrap ships in Phase 4. Visible per the locked design; not a data stub for this plan.

## Issues Encountered
- **Full-project `npm run lint` timed out repeatedly (~3+ min, environmental).** Task 1's identical full lint passed (exit 0, "No issues found"); the later timeouts correlated with CPU/memory churn from background monitor processes, not a code fault. Verified the changed files are clean via `npx eslint <files>` ("No issues found") and the authoritative `npm run build` (exit 0, which runs Next's own lint/type pass). Not a regression.
- Pre-existing non-fatal build warning: `@react-native-async-storage/async-storage` "Module not found" from the MetaMask SDK (Phase-1 provider tree). Out of scope; build exits 0. Logged in 02-01/02-02, not fixed.

## User Setup Required
None — all client-side; public Sepolia RPC fallback already configured in Phase 1.

## Human Verification Pending (Task 3 — checkpoint:human-verify)
The final visual sign-off on the complete Cellar Registry browser (live/local URL) is **pending** and returned to the orchestrator to relay. Items to confirm:
1. Hero renders with engraving art + live pair count; all onchain pairs list as cards.
2. 7 branded cTokens show real icons; the 2 non-branded pairs show monogram tiles (no broken images).
3. Each card shows both addresses (copy → success toast), symbol/name/decimals, valid/revoked badge.
4. Search filters live by symbol/name/address; ALL/VALID/REVOKED chips work; no-match shows the empty copy echoing the query.
5. Loading shows the 6-card skeleton; parchment/cellar theme toggle follows via CSS vars.
6. (Optional) Throttle/deny RPC → red retry banner + working Retry.

## Next Phase Readiness
- The registry browser (browse + search + filter + states) is feature-complete pending the visual gate. `AddressCopyButton`, `PairBadge`, `TokenIcon`, and the state components are reusable for Phase 4/5.
- `useRegistryPairs.refetch` is proven as the retry path; wrap/unwrap panels can reuse the same react-query error/retry pattern.

## Self-Check: PASSED
- Files verified present (see below)
- Commits verified in git log (d187a14, ee6dc14)

---
*Phase: 02-registry-browse*
*Completed: 2026-07-07*
