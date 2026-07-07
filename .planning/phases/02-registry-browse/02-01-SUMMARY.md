---
phase: 02-registry-browse
plan: 01
subsystem: ui
tags: [wagmi, viem, multicall, vitest, react-query, registry, erc7984]

# Dependency graph
requires:
  - phase: 01-foundation-deploy-spike
    provides: client-only FHE provider tree, ChainGuard (Sepolia gate), COOP/COEP headers, scaffold public-RPC fallback
provides:
  - "useRegistryPairs data engine: onchain registry read -> one Multicall3 metadata batch -> regroup -> hybrid merge"
  - "Three test-locked pure functions: tokenSymbol (normalize/iconKey/truncate), mergePairs (dedup/onchain-wins/revoked-retained), regroupMeta (chunk-of-6 + allowFailure fallbacks)"
  - "Verified minimal registry ABI (registryAbi + erc20MetadataAbi) + REGISTRY_ADDRESS per chainId"
  - "Typed localPairs overlay (pairs.config.ts) with add-a-pair docs"
  - "Minimal live PairGrid/PairCard rendering every onchain pair with real metadata + both addresses + valid/revoked"
  - "vitest 4.1.10 test runner + config (node env, lib/**/*.test.ts)"
affects: [02-02 cellar-ui, 02-03 search-filter, 04-wrap, 05-unwrap]

# Tech tracking
tech-stack:
  added: ["vitest@4.1.10 (dev)", "@vitest/coverage-v8@4.1.10 (dev)"]
  patterns:
    - "Two-phase onchain read: useReadContract (enumerate) -> useReadContracts multicall (enrich), never per-token"
    - "TDD RED->GREEN for correctness-critical pure functions"
    - "Symbol normalization (strip Mock, strip leading c, lowercase) for icon/display keys"
    - "Hybrid merge keyed by lowercased ERC-7984 address, onchain written last (wins)"

key-files:
  created:
    - packages/nextjs/hooks/useRegistryPairs.ts
    - packages/nextjs/lib/tokenSymbol.ts
    - packages/nextjs/lib/mergePairs.ts
    - packages/nextjs/lib/regroupMeta.ts
    - packages/nextjs/registry/abis.ts
    - packages/nextjs/registry/addresses.ts
    - packages/nextjs/registry/types.ts
    - packages/nextjs/registry/pairs.config.ts
    - packages/nextjs/components/registry/PairGrid.tsx
    - packages/nextjs/components/registry/PairCard.tsx
    - packages/nextjs/vitest.config.ts
  modified:
    - packages/nextjs/app/page.tsx
    - packages/nextjs/package.json

key-decisions:
  - "Pinned vitest + @vitest/coverage-v8 to EXACT 4.1.10 (latest stable) after human legitimacy approval — corrected from the plan's 3.2.x (plan predates 4.x; no template constraint on the test runner)"
  - "Multicall (useReadContracts) is mandatory — keyless public Sepolia RPC rate-limits per-token reads (Pitfall 1)"
  - "Local overlay pairs are NOT part of the onchain multicall this plan; they resolve via optional overrides + truncated-address fallback (localPairs empty by default)"
  - "Render the FULL onchain array (9 pairs live), never a hardcoded 7 (Pitfall 3)"

patterns-established:
  - "Onchain-read data engine: useReadContract -> useReadContracts(allowFailure) -> regroupMeta -> mergePairs"
  - "Untrusted onchain name/symbol rendered via JSX escaping only, never dangerouslySetInnerHTML (T-02-01)"

requirements-completed: [REG-01, REG-02, REG-03, REG-04, REG-05, REG-06]

coverage:
  - id: D1
    description: "Three correctness-critical pure functions locked by unit tests: symbol normalization (Mock/c strip), hybrid merge (dedup, onchain-wins, revoked-retained), multicall regroup (chunk-of-6 + allowFailure fallbacks)"
    requirement: "REG-02, REG-03, REG-05"
    verification:
      - kind: unit
        ref: "lib/tokenSymbol.test.ts, lib/mergePairs.test.ts, lib/regroupMeta.test.ts (17 tests, vitest run)"
        status: pass
    human_judgment: false
  - id: D2
    description: "useRegistryPairs reads the onchain registry (never hardcoded) and resolves both-side metadata via one Multicall3 batch"
    requirement: "REG-01, REG-03, REG-04"
    verification:
      - kind: integration
        ref: "live Sepolia eth_call via viem: getTokenConfidentialTokenPairs returned 9 valid pairs, 7/7 branded cTokens present"
        status: pass
      - kind: manual_procedural
        ref: "connect Sepolia wallet on live/local URL; confirm >=9 pairs render with real symbol/name/decimals; Network tab shows single Multicall3 aggregate"
        status: unknown
    human_judgment: true
    rationale: "Full render requires a connected Sepolia wallet on the live URL; automated integration confirms the read + count but not the in-browser render path"
  - id: D3
    description: "Minimal PairCard shows both-network addresses, symbol/name/decimals for each side, and a valid/revoked marker (REAL data, no theme/icons yet)"
    requirement: "REG-06"
    verification:
      - kind: manual_procedural
        ref: "live URL visual check: each card shows ERC-20 + ERC-7984 address, both decimals, valid/revoked marker"
        status: unknown
    human_judgment: true
    rationale: "Visual layout fidelity + wallet-gated render are manual per 02-VALIDATION"
  - id: D4
    description: "vitest 4.1.10 test infrastructure added; typecheck, lint, and next build all clean with no @zama-fhe/FHE dependency"
    verification:
      - kind: automated
        ref: "npm run check-types (exit 0), npm run lint (0 warnings), npm run build (exit 0)"
        status: pass
    human_judgment: false

# Metrics
duration: 11min
completed: 2026-07-07
status: complete
---

# Phase 02 Plan 01: Registry Data Engine + Minimal Live Render Summary

**Test-first registry data engine — `useRegistryPairs` reads the onchain Sepolia registry (9 live pairs), resolves both-side metadata in one Multicall3 batch, merges a local overlay (onchain wins), and renders every pair with real data; three pure functions locked by 17 vitest units.**

## Performance

- **Duration:** ~11 min (execution, post-checkpoint)
- **Started:** 2026-07-07T16:03:15Z
- **Completed:** 2026-07-07T16:13:39Z
- **Tasks:** 3 (Task 1 checkpoint approved; Task 2 TDD RED+GREEN; Task 3)
- **Files modified:** 13 created / 2 modified (+ package-lock)

## Accomplishments
- **Data engine (`useRegistryPairs`)**: one `useReadContract` enumerates onchain pairs, one `useReadContracts` multicall resolves symbol/name/decimals for both sides (6×N in a single Multicall3 aggregate — never per-token), then `regroupMeta` → `mergePairs(localPairs)`. Returns `{ pairs, validCount, isLoading, isError, refetch }`.
- **Three test-locked pure functions** (RED→GREEN, 17 vitest tests): `tokenSymbol` (iconKey/iconFor/normalizeSymbol/truncateAddress — Pitfall-2 fix), `mergePairs` (dedup by lowercased ERC-7984 addr, onchain wins, revoked retained), `regroupMeta` (chunk-of-6 + `allowFailure` fallbacks).
- **Verified minimal ABIs** (`registryAbi` + `erc20MetadataAbi`) transcribed verbatim from RESEARCH (triple-source verified) — anti-hallucination compliant.
- **Minimal live render**: `PairGrid`/`PairCard` show both addresses, both decimals, name, and a valid/revoked marker for every pair, under the untouched Phase-1 `ChainGuard` + provider tree.
- **Live-verified**: registry returns **9 valid pairs, all 7 branded cTokens present** (REG-01/04) via direct eth_call using the same ABI.

## Task Commits

1. **Task 2 (RED): failing unit tests + vitest infra** - `83e5212` (test)
2. **Task 2 (GREEN): pure functions + verified ABI/config** - `43f7d40` (feat)
3. **Task 3: useRegistryPairs hook + minimal live render** - `e0dd024` (feat)

_TDD task committed as test(RED) → feat(GREEN) per the TDD gate._

## Files Created/Modified
- `hooks/useRegistryPairs.ts` - Registry data engine (read → multicall → regroup → merge)
- `lib/tokenSymbol.ts` (+`.test.ts`) - Symbol normalization + icon path + address truncation
- `lib/mergePairs.ts` (+`.test.ts`) - Hybrid merge, dedup by confidential addr, onchain wins
- `lib/regroupMeta.ts` (+`.test.ts`) - Flat 6×N multicall → per-pair enriched metadata
- `registry/abis.ts` - Verified registryAbi + erc20MetadataAbi
- `registry/addresses.ts` - REGISTRY_ADDRESS per chainId (Sepolia 0x2f0750…128e)
- `registry/types.ts` - TokenMeta, RegistryPair, LocalPair
- `registry/pairs.config.ts` - Empty typed localPairs overlay + add-a-pair docs (REG-05/07)
- `components/registry/PairGrid.tsx`, `PairCard.tsx` - Minimal presentational grid
- `app/page.tsx` - Renders RegistryBody under ChainGuard (provider tree untouched)
- `vitest.config.ts`, `package.json` - Test runner (node env, lib/**/*.test.ts)

## Decisions Made
- **vitest pinned EXACT 4.1.10** (both `vitest` and `@vitest/coverage-v8`) — coordinator correction over the plan's 3.2.x, approved after human legitimacy verification (VoidZero/Vitest official, 67.9M downloads/wk, no install-time scripts). Node v22.21.1 is compatible.
- **Local overlay metadata** uses `overrides` + truncated-address fallback (not the onchain multicall) per the plan's step ordering; `localPairs` ships empty so the path is inert-but-correct.
- **Render the full onchain array** (9 pairs), treating the 7 branded cTokens as a guaranteed subset, not the total (Pitfall 3).

## Deviations from Plan

### Auto-fixed / Coordinator-directed

**1. [Coordinator-directed] vitest version corrected 3.2.x → EXACT 4.1.10**
- **Found during:** Task 1 checkpoint resolution
- **Issue:** Plan/RESEARCH predate the vitest 4.x line; no template constraint exists on the test runner.
- **Fix:** Installed `vitest@4.1.10` + `@vitest/coverage-v8@4.1.10` with `--save-exact` after human legitimacy approval.
- **Files modified:** package.json, package-lock.json
- **Verification:** `npx vitest run` green (17/17); versions pinned exact.
- **Committed in:** 83e5212 (Task 2 RED commit)

---

**Total deviations:** 1 (coordinator-directed version pin). No scope creep.
**Impact on plan:** None on scope; test runner is newer/stable.

## Issues Encountered
- Pre-existing non-fatal build warning: `@react-native-async-storage/async-storage` "Module not found" from the MetaMask SDK (via RainbowKit/wagmi connectors, Phase-1 provider tree). Out of scope for this plan; build completes (exit 0) and static pages generate. Logged as pre-existing, not fixed.

## User Setup Required
None - no external service configuration required (public Sepolia RPC fallback already configured in Phase 1).

## Next Phase Readiness
- Data engine + typed `RegistryPair[]` ready for 02-02 (Cellar engraving UI + real cToken icons), 02-03 (search/valid-revoked filter).
- Icon files must be copied into `public/icons/` in 02-02; `iconFor()` already maps normalized keys to `/icons/c{key}.png` with a monogram-fallback contract.
- 2 extra onchain pairs (#8, #9) have no branded icon — they will use the monogram fallback in 02-02.

## Self-Check: PASSED
- Files verified present (see below)
- Commits verified in git log (83e5212, 43f7d40, e0dd024)

---
*Phase: 02-registry-browse*
*Completed: 2026-07-07*
