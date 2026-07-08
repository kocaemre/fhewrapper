---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 5
current_phase_name: async finalize
status: executing
stopped_at: Completed 05-01-PLAN.md (honest unwrap engine — stages/amount/errors/pending + useUnwrap; live two-tx unwrap→finalize proof deferred to 05-UAT.md).
last_updated: "2026-07-08T06:20:02.949Z"
last_activity: 2026-07-08
last_activity_desc: Completed 05-01 (honest unwrap engine); 05-02 next
progress:
  total_phases: 7
  completed_phases: 4
  total_plans: 14
  completed_plans: 13
  percent: 57
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-07)

**Core value:** The wrap → decrypt → unwrap loop works flawlessly on a live Sepolia URL — every official registry pair easy to find, wrap/unwrap correct onchain, any ERC-7984 balance decryptable via a correct EIP-712 flow.
**Current focus:** Phase 01 — foundation-deploy-spike

## Current Position

Phase: 5 — Unwrap (async finalize)
Plan: 05-01 complete; 05-02 next
Status: Executing — 05-01 shipped the honest unwrap engine: nextUnwrapStage reducer + isUnwrapSuccess (success ONLY at finalized; UNW-02, RED→GREEN), parseUnwrapAmount (decimals-driven 6-dp & 18-dp, never throws; UNW-01), toUnwrapError map, browserPendingStorage pending-unshield shim (never-strand-funds, RED→GREEN), and useUnwrap wrapping useUnshield/useUnshieldAll + useResumeUnshield with no operator step. Gates green (check-types / next build / vitest 98). Live two-tx unwrap→finalize→ERC-20-arrives proof (UNW-01/02) deferred to 05-UAT.md.
Last activity: 2026-07-08 — Completed 05-01 (honest unwrap engine)

Progress: [█████░░░░░] 50% (phase 05: 1/2 plans)

## Performance Metrics

**Velocity:**

- Total plans completed: 12
- Average duration: — min
- Total execution time: 0.0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
| ----- | ----- | ----- | -------- |
| 01 | 3 | - | - |
| 02 | 4 | - | - |
| 03 | 3 | - | - |
| 04 | 2 | - | - |
| 05 | 1 | 6min | 6min |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

_Updated after each plan completion_
| Phase 01 P01 | 21 | 3 tasks | 71 files |
| Phase 01 P02 | 2min | 2 tasks | 2 files |
| Phase 01 P03 | 40min | 2 tasks | 8 files |
| Phase 02 P01 | 11min | 3 tasks | 15 files |
| Phase 02 P02 | 19min | 3 tasks | 17 files |
| Phase 02 P04 | 1min | 1 tasks | 1 files |
| Phase 02 P03 | 33min | 3 tasks | 8 files |
| Phase 03 P01 | 10 | 2 tasks | 8 files |
| Phase 03 P02 | 24 | 3 tasks | 7 files |
| Phase 03 P03 | 22 | 2 tasks | 5 files |
| Phase 04 P01 | 4min | 3 tasks | 8 files |
| Phase 04 P02 | 9min | 3 tasks | 10 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Deploy/correctness risk front-loaded — retire COOP/COEP + WASM/SSR on a real Vercel URL (Phase 1) before building features.
- [Roadmap]: Registry browse (Phase 2) built with no SDK dependency to de-risk Coverage early and yield a visible product.
- [Roadmap]: User-decryption (Phase 3) built before wrap/unwrap so it can verify every other flow's result.
- [Roadmap]: Animation differentiator deferred to Phase 7, gated on a verified core loop; all media self-hosted (COEP `require-corp` blocks cross-origin assets).
- [Phase ?]: FND-01 version corrected 3.2.0 -> 3.0.0 (human-approved): template locks 3.0.0; 3.2.0 breaking changes incompatible with preserved provider (FND-03). Exact-pin intent preserved.
- [Phase ?]: ChainGuard owns connect + wrong-network + on-Sepolia states; page.tsx composes by wrapping guarded content only (01-02)
- [Phase ?]: crossOriginIsolated read post-mount (useEffect) to show live value without SSR hydration mismatch (01-02)
- [02-01]: vitest + @vitest/coverage-v8 pinned EXACT 4.1.10 (human-approved legitimacy) — corrected from plan's 3.2.x; no template constraint on the test runner.
- [02-01]: Registry data engine = useReadContract (enumerate) -> useReadContracts multicall (enrich, allowFailure) -> regroupMeta -> mergePairs(localPairs); multicall mandatory (keyless public RPC rate-limits). Render full onchain array (9 live pairs), never hardcode 7.
- [Phase 02]: 02-02: Fonts via next/font (self-hosted) not a cross-origin Google Fonts <link> — COEP require-corp would block the CDN (T-02-05)
- [Phase 02]: 02-02: next-themes value-map light->parchment / dark->cellar keeps RainbowKit resolvedTheme keys intact (layout.tsx only)
- [Phase ?]: 02-03: client-side search matches raw+normalized symbol, name, and both addresses; ALL/VALID/REVOKED chip AND-combines with search (pure filterPairs, 10 vitest units)
- [Phase ?]: 02-03: data states branch on useRegistryPairs — 6-card skeleton (reduced-motion-safe) / RegistryError(refetch) / RegistryEmpty echoing query / PairGrid
- [03-01]: Installed EXACT 3.0.0 @zama-fhe/react-sdk uses useAllow/useIsAllowed/useConfidentialBalance — NOT useGrantPermit/useHasPermit/useDecryptValues (those don't exist in 3.0.0 and fail to compile). Single reusable non-token-specific EIP-712 permit via useAllow; useConfidentialBalance returns the decrypted cleartext bigint directly (DEC-01/03).
- [03-01]: useIsAllowed config is a NON-EMPTY [Address,...Address[]] tuple — pass [tokenAddress ?? zeroAddress] (never []); the real decrypt is gated by the enabled flag so the placeholder is a cheap local permit read only.
- [03-01]: Decrypt error taxonomy is instanceof + matchAclRevert (never string-match revert messages); NoCiphertext/zero-handle renders 0, never an error (DEC-04). Cleartext formatted by the token's own decimals via formatUnits (Pitfall 5).
- [03-03]: DecryptQuickPicks sources chips from the SAME Phase-2 useRegistryPairs (valid only, deduped by confidential address) — the registry entry point (DEC-02) alongside paste-an-address; PermitIndicator uses verified 3.0.0 useIsAllowed for the VIEWING KEY ACTIVE badge (DEC-03), zeroAddress placeholder + real-address gate for W2.
- [03-03]: Decrypt hero shipped as optimized PNG (295x440, 277KB) NOT WebP — the plan's files_modified + automated verify (test -f public/02-bottle-hero.png) + <img src="/02-bottle-hero.png"> pin the .png filename; no lossy PNG compressor (pngquant/oxipng) installed, so 277KB is the practical PNG floor (cwebp would be ~104KB if the filename constraint relaxes).
- [03-03]: Live-URL decrypt phase gate DEFERRED (time-box directive) to a single end-of-project manual session — see 03-UAT.md (DEC-01…DEC-04 + record concrete no-ACL error class → resolves RESEARCH Open Q1). Code + automated gates green now.
- [04-01]: Faucet is a plain wagmi public mint(address,uint256) on the cTokenMock UNDERLYING ERC-20 (verified selector 0x40c10f19, no access control, 1,000,000/call cap) — NO SDK/FHE, NO cooldown (a cooldown UI would be fiction). Success = receipt, not submit. Amount clamped then parseUnits by the token's own decimals (never 18). tGBP detected by symbol and disabled up-front with restricted copy; every failure mapped to readable copy (no raw revert). Live faucet proof (FCT-01/FCT-02) deferred to 04-UAT.md.
- [04-02]: WRAP = ONE useShield({ tokenAddress, wrapperAddress }) — both = confidential addr (ERC7984ERC20Wrapper IS the confidential token; installed 3.0.0, NOT docs' { address }). approve+wrap auto-orchestrated; onApprovalSubmitted/onShieldSubmitted + mutation receipt drive the 4-stage indicator (never hand-roll approve+wrap). previewWrap is PURE bigint floor(underlyingRaw/rate) with rate() + per-side decimals read onchain via rateContract (never hardcode 18); belowOneUnit disables Wrap. toWrapError = instanceof ZamaError subclasses → copy (no raw revert). Decrypt==preview proof reuses Phase-3 PairCardDecrypt on stage=done. approvalStrategy default 'max'. /wrap resolves the pair from trusted useRegistryPairs (?token=) under ChainGuard + Suspense. Live wrap + decrypt==preview proof (WRP-01/02, amount-scale Open Q1/A2) deferred to 04-UAT.md.

### Pending Todos

[From .planning/todos/pending/ — ideas captured during sessions]

None yet.

### Blockers/Concerns

[Issues that affect future work]

- Research flags open GAPs to close during phase planning: exact `@zama-fhe/react-sdk` v3.2.0 hook signatures (Phase 1/3), cTokenMock faucet claim fn signature vs deployed ABI (Phase 4), whether `finalizeUnwrap` is oracle- or app-driven (Phase 5), and `require-corp` vs `credentialless` COEP mode on the live deploy (Phase 1).
- Source REQUIREMENTS.md coverage summary previously read "33 total"; actual distinct v1 IDs = 34. Traceability corrected to 34/34.
- Plan 03 deploy: two lockfiles (package-lock.json + pnpm-lock.yaml) — force Vercel to npm, Root Directory=packages/nextjs, keep NEXT_PUBLIC_IPFS_BUILD unset; FHECounter.local.ts gitignored, regenerate at install.

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category      | Item                                                  | Status | Deferred At  |
| ------------- | ----------------------------------------------------- | ------ | ------------ |
| Extensibility | EXT-01 onchain admin UI for registerConfidentialToken | v2     | Roadmap init |
| Extensibility | EXT-02 live react-three-fiber 3D bottle scene         | v2     | Roadmap init |
| Extensibility | EXT-03 multi-wallet / account-abstraction connect     | v2     | Roadmap init |

## Session Continuity

Last session: 2026-07-08T06:20:02.944Z
Stopped at: Completed 04-02-PLAN.md (wrap slice; live wrap + decrypt==preview proof deferred to 04-UAT.md). Phase 04 complete.
Resume file: None
