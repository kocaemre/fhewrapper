---
phase: 02-registry-browse
verified: 2026-07-07T00:00:00Z
status: passed
score: 4/4 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  # No previous VERIFICATION.md — initial verification
requirements_covered:
  - REG-01
  - REG-02
  - REG-03
  - REG-04
  - REG-05
  - REG-06
  - REG-07
---

# Phase 2: Registry Browse Verification Report

**Phase Goal:** Every official ERC-20 ↔ ERC-7984 wrapper pair is discoverable, sourced from the onchain Sepolia registry (`0x2f0750Bbb0A246059d80e94c454586a7F27a128e`) with real token metadata — no FHE/WASM dependency.
**Verified:** 2026-07-07
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

The registry browse slice is delivered end-to-end and code-verified. All four ROADMAP success criteria are satisfied by substantive, wired code; the runtime UI (visual card layout + interactions) was human-confirmed on the live URL (https://fhewrapper-nextjs.vercel.app/), which upgrades the behavior-dependent visual/interaction truths to VERIFIED rather than leaving them present-but-unexercised. Automated evidence: vitest 27/27 green, `tsc --noEmit` clean, zero `@zama-fhe`/FHE imports in the phase code (FHE-free as designed).

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | On a fresh/incognito wallet, the pair list is populated entirely from onchain reads of the registry at `0x2f0750…128e` (never hardcoded), with revoked filterable via `isValid` | ✓ VERIFIED | `hooks/useRegistryPairs.ts` reads `getTokenConfidentialTokenPairs` from `REGISTRY_ADDRESS` (`registry/addresses.ts` = `0x2f0750Bbb0A246059d80e94c454586a7F27a128e`), `chainId: sepolia.id` pinned so it resolves off the public RPC with no connected account. `app/page.tsx` renders `RegistryBody` un-gated (not wrapped in `ChainGuard`) — the documented REG-01 fresh-wallet fix. `mergePairs` retains revoked; `lib/filterPairs.ts` narrows by `isValid` (all/valid/revoked). Human-confirmed: 9 pairs render on live URL, revoked shown with a badge (not dropped). |
| 2 | All 7 official cTokenMocks render with correct symbol, name, decimals resolved via multicall | ✓ VERIFIED | `useReadContracts` batches symbol/name/decimals for BOTH sides of every pair in one Multicall3 aggregate; `lib/regroupMeta.ts` chunks the flat 6×N result back per pair with per-call `allowFailure` guards (unit-tested). Icon-key resolution verified for all 7 (`cUSDCMock→/icons/cusdc.png` … `cXAUtMock→/icons/cxaut.png`), all 7 files present in `public/icons/`. Human-confirmed: 7 branded icons + 2 monogram fallbacks on live URL. |
| 3 | Each pair card shows both-network addresses, symbol/name/decimals, and a valid/revoked badge | ✓ VERIFIED (human-confirmed) | `components/registry/PairCard.tsx`: identity row (icon + `cSymbol ⇄ symbol` + italic name + `PairBadge`), both-network copyable rows (ERC-20 + ERC-7984 via `AddressCopyButton`), per-side decimals + Wrap CTA. Revoked → opacity 0.6 + `Unavailable`. Human visually confirmed on live URL (approved). |
| 4 | A pair added to `registry/pairs.config.ts` appears in the UI, deduped by confidential address (onchain wins), and the README documents the add-a-pair flow with a concrete example | ✓ VERIFIED | `lib/mergePairs.ts` dedups by lowercased confidential address, writing local first then onchain last so onchain overwrites on conflict (unit-tested). `registry/pairs.config.ts` exports typed `localPairs: LocalPair[]` (empty by default). `README.md` has "Adding a wrapper pair" with a copy-pasteable `LocalPair` example, the dedup/onchain-wins precedence rule, and onchain-sourcing + Sepolia network notes. |

**Score:** 4/4 truths verified (0 present, behavior-unverified)

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| REG-01 | 02-01 | Onchain registry as source of truth (never hardcoded) | ✓ SATISFIED | `useRegistryPairs` + `addresses.ts` + un-gated page (Truth 1) |
| REG-02 | 02-01/02-03 | Revoked pairs filtered client-side via `isValid` | ✓ SATISFIED | `mergePairs` retains + `filterPairs` ALL/VALID/REVOKED + `RegistryToolbar` chips |
| REG-03 | 02-01 | Metadata resolved from token contracts via multicall | ✓ SATISFIED | `useReadContracts` + `regroupMeta` (Truth 2) |
| REG-04 | 02-01/02-02 | All 7 official cTokenMocks surface | ✓ SATISFIED | icon-key resolution for all 7 + files present + human-confirmed |
| REG-05 | 02-01 | Hybrid sourcing, dedup by confidential addr, onchain wins | ✓ SATISFIED | `mergePairs` + `pairs.config.ts` (Truth 4) |
| REG-06 | 02-02 | Card shows both addresses, symbol/name/decimals, status | ✓ SATISFIED | `PairCard.tsx` + human visual confirm (Truth 3) |
| REG-07 | 02-04 | README documents add-a-pair with concrete example | ✓ SATISFIED | `README.md` "Adding a wrapper pair" section (Truth 4) |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `hooks/useRegistryPairs.ts` | Data engine: onchain read + multicall + merge | ✓ VERIFIED | Two-phase read, Sepolia-pinned, returns pairs/validCount/isLoading/isError/refetch |
| `lib/mergePairs.ts` | Hybrid dedup, onchain wins | ✓ VERIFIED | Map keyed by lowercased confidential addr; onchain written last |
| `lib/regroupMeta.ts` | Chunk 6×N multicall back per pair | ✓ VERIFIED | `allowFailure` guards; falls back to truncated address / flagged decimals |
| `lib/tokenSymbol.ts` | Icon-key normalization | ✓ VERIFIED | `iconKey`/`iconFor`/`normalizeSymbol`/`truncateAddress`; all 7 resolve |
| `lib/filterPairs.ts` | Search + valid/revoked filter (pure) | ✓ VERIFIED | Case-insensitive across symbol/cSymbol/name/both addresses AND `isValid` chip |
| `registry/abis.ts` | Minimal registry + ERC-20 metadata ABIs | ✓ VERIFIED | `getTokenConfidentialTokenPairs` + metadata fragment, hand-written |
| `registry/addresses.ts` | Registry address constant | ✓ VERIFIED | `0x2f0750…128e` per chainId, Sepolia default |
| `registry/pairs.config.ts` | Local overlay (empty default) | ✓ VERIFIED | `localPairs: LocalPair[] = []` with documented example |
| `app/page.tsx` | Compose hook → filter → grid + states | ✓ VERIFIED | Un-gated; branches loading/error/empty/grid |
| `components/registry/*` | Card, hero, toolbar, states, icon, badge, copy | ✓ VERIFIED | All 11 components present, imported, and used |
| `public/icons/*.png` (7) | Self-hosted branded icons | ✓ VERIFIED | 7 files, each 27–34 KB (well under 200 KB / COEP-safe) |
| `README.md` | Add-a-pair documentation | ✓ VERIFIED | Concrete `LocalPair` example + precedence rule |

### Key Link Verification

| From | To | Via | Status |
|------|----|----|--------|
| `useRegistryPairs` | registry `0x2f0750…128e` | `useReadContract(getTokenConfidentialTokenPairs)` then `useReadContracts` multicall | ✓ WIRED |
| `regroupMeta` | per-pair metadata | chunk-of-6 with `allowFailure` guards | ✓ WIRED |
| `mergePairs` | dedup precedence | confidential addr lowercased; onchain written last (wins) | ✓ WIRED |
| `app/page.tsx` | `useRegistryPairs` → `filterPairs` → `PairGrid` | `useMemo(filterPairs(pairs, search, filter))` | ✓ WIRED |
| `RegistryError` | hook `refetch` | `onRetry={refetch}` → `onClick={onRetry}` | ✓ WIRED |
| `RegistryHero` | live valid-pair count | `pairCount={validCount}` | ✓ WIRED |
| `TokenIcon` | self-hosted icons | `iconFor(confidentialSymbol)` → `/icons/c{key}.png` + monogram fallback | ✓ WIRED |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `PairGrid`/`PairCard` | `pairs` | `useRegistryPairs` → onchain `getTokenConfidentialTokenPairs` + multicall metadata | Yes (live registry read; human-confirmed 9 real pairs) | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Pure functions locked by units | `npx vitest run` | PASS (27) FAIL (0) | ✓ PASS |
| Type safety | `npm run check-types` (`tsc --noEmit`) | no errors | ✓ PASS |
| FHE-free (no WASM dependency) | grep `@zama-fhe`/`initSDK`/`fhevm` in phase code | none (only a text label in `RegistryHero`) | ✓ PASS |
| All 7 icon keys resolve to existing files | node icon-key eval vs `public/icons/` | 7/7 resolve | ✓ PASS |

### Anti-Patterns Found

None. No `TODO`/`FIXME`/`XXX`/`TBD`/`HACK` markers in phase code. The "placeholder" grep hits are legitimate (loading-skeleton doc comment, input placeholder text). `localPairs = []` is an intentional, documented empty overlay — not a stub. The inert `Wrap →` CTA is intentionally deferred (wrap ships Phase 4) and documented in `PairCard.tsx`.

### Human Verification Required

None outstanding. The visual card layout (REG-06), the 7-branded-icons render (REG-04), and the search + ALL/VALID/REVOKED filter interactions were already human-confirmed on the live URL (approved), which is why the behavior-dependent visual/interaction truths are recorded VERIFIED rather than present-behavior-unverified.

### Deferred (not gaps)

- Further visual polish is intentionally deferred to Phase 7 (DIF-04 registry-browser polish) per the user — not a Phase 2 gap.
- The `Wrap →` CTA is inert this phase; wrap functionality is Phase 4 (WRP-01/02).

### Gaps Summary

No gaps. All four ROADMAP success criteria and REG-01..07 are satisfied by substantive, wired code with real data flowing from the onchain Sepolia registry. Automated gates (vitest 27/27, typecheck clean, FHE-free) pass; the runtime UI was human-confirmed on the live deploy. Phase goal achieved.

---

_Verified: 2026-07-07_
_Verifier: Claude (gsd-verifier)_
