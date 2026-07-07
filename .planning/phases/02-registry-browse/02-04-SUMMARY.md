---
phase: 02-registry-browse
plan: 04
subsystem: docs
tags: [readme, registry, hybrid-overlay, reg-05, reg-07]

# Dependency graph
requires:
  - phase: 02-registry-browse
    provides: "typed LocalPair overlay (registry/pairs.config.ts + registry/types.ts) from 02-01"
provides:
  - "README 'Wrapper registry' section documenting onchain sourcing + the add-a-pair overlay flow"
  - "Concrete copy-pasteable LocalPair example matching the exported type shape"
  - "Plain-language dedup-by-confidential-address / onchain-wins precedence rule (REG-05)"
affects: [07-submission]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Documentation kept in lockstep with the actual exported LocalPair type (registry/types.ts)"

key-files:
  created: []
  modified:
    - README.md

key-decisions:
  - "Placed the registry docs as a new top-level 'Wrapper registry' section after 'Project structure' and before 'Troubleshooting'"
  - "Reused the illustrative example addresses already present in pairs.config.ts (underlying 0x9b5C…DFfF, confidential 0x7c5B…3639) and labelled them illustrative so no fake pair implies a real shipped overlay"
  - "Documented the full LocalPair type verbatim (including overrides + isValid default) so the README example cannot drift from registry/types.ts"

# Metrics
duration: 1min
completed: 2026-07-07
status: complete
---

# Phase 02 Plan 04: README Add-a-Pair Documentation Summary

**Documented the hybrid wrapper-registry model in the root README: pairs are read live from the onchain Sepolia registry (never hardcoded), and a typed `localPairs: LocalPair[]` overlay in `registry/pairs.config.ts` lets a developer add a custom pair — deduped by lowercased confidential (ERC-7984) address with the onchain entry always winning on conflict (REG-05, REG-07).**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-07-07T16:40:41Z
- **Completed:** 2026-07-07T16:41:18Z
- **Tasks:** 1 (Task 1, `type="auto"`)
- **Files modified:** 1 (README.md)

## Accomplishments
- Added a **"Wrapper registry"** section to the root `README.md` with two subsections:
  - **How the registry is sourced** — pairs read live from the onchain Sepolia Wrappers Registry at `0x2f0750Bbb0A246059d80e94c454586a7F27a128e` (never hardcoded), both-side metadata resolved via one Multicall3 batch, revoked pairs flagged via `isValid` (shown, not dropped), and the supported network named (Sepolia testnet, chain id 11155111).
  - **Adding a wrapper pair** — the `LocalPair` type reproduced verbatim from `registry/types.ts`, a concrete copy-pasteable `localPairs` example entry, a note that the shipped config stays empty and that addresses are validated via viem `isAddress`/`getAddress`, and the plain-language precedence rule.
- **Precedence rule documented** (REG-05 / REG SC4): entries deduped by lowercased `confidentialTokenAddress`; the onchain registry entry always wins — a local entry can only surface a pair the registry does not already list, never override a real onchain pair.
- **Type fidelity verified:** the documented `LocalPair` shape (tokenAddress, confidentialTokenAddress, optional isValid, optional overrides) matches the actual exported type in `packages/nextjs/registry/types.ts` and the example in `pairs.config.ts`.

## Task Commits

1. **Task 1: README 'Wrapper registry' add-a-pair + sourcing section** — `a3ef93d` (docs)

## Files Created/Modified
- `README.md` — new "Wrapper registry" section (sourcing note + add-a-pair overlay docs + onchain-wins precedence rule)

## Decisions Made
- Placed the section after "Project structure" / before "Troubleshooting" for logical flow.
- Reused the illustrative example addresses already in `pairs.config.ts`, explicitly labelled illustrative, so no reader assumes a fake pair ships live.
- Documented the full `LocalPair` type (including `overrides` and the `isValid` default) so the README cannot silently drift from `registry/types.ts`.

## Deviations from Plan
None — plan executed exactly as written. Documentation-only change; no code touched (02-02/02-03 own the code, sequential-safe).

## Threat Model Coverage
- **T-02-07 (Tampering — unchecked local-config example):** mitigated in the README, which states addresses are validated by viem `isAddress`/`getAddress` at load (invalid entries skipped with a console warning) and that onchain entries win, so a bad or duplicate local entry cannot override or mask a real onchain pair.

## Issues Encountered
None.

## User Setup Required
None — documentation only.

## Self-Check: PASSED
- File verified present: `.planning/phases/02-registry-browse/02-04-SUMMARY.md`, `README.md` (modified)
- Commit verified in git log: `a3ef93d`
- Plan verification greps pass: `pairs.config.ts` present, onchain-wins phrasing present, add-a-pair present

---
*Phase: 02-registry-browse*
*Completed: 2026-07-07*
