---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 7
current_phase_name: Polish + Animation Differentiator + Submission
status: executing
stopped_at: Completed 07-01-PLAN.md (signature wrap cinematic — honest reveal-gated engine + ffmpeg-compressed self-hosted beats + skippable tx-driven overlay; vitest 130/130, build clean; live proofs deferred to 07-UAT.md).
last_updated: "2026-07-08T07:40:00.000Z"
last_activity: 2026-07-08
last_activity_desc: 07-01 wrap cinematic complete (DIF-01/DIF-02)
progress:
  total_phases: 7
  completed_phases: 6
  total_plans: 20
  completed_plans: 17
  percent: 85
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-07)

**Core value:** The wrap → decrypt → unwrap loop works flawlessly on a live Sepolia URL — every official registry pair easy to find, wrap/unwrap correct onchain, any ERC-7984 balance decryptable via a correct EIP-712 flow.
**Current focus:** Phase 01 — foundation-deploy-spike

## Current Position

Phase: 7 — Polish + Animation Differentiator + Submission
Plan: 07-01 complete (1/4)
Status: Executing — 07-01 shipped the signature wrap cinematic (DIF-01/DIF-02). lib/cinematicBeats.ts is a PURE, unit-locked (RED→GREEN) engine mapping the real useWrap stage → six engraving beats; the reveal beats (pop/token) are structurally unreachable until stage==="done" (the mined receipt), so the overlay cannot lie about the tx (threat T-07-01, top honesty axis). The six RAW Kling beats were ffmpeg-8.0.1-compressed to 720p H.264 (crf28 +faststart, audio stripped) at 0.29–0.86MB each and self-hosted under public/cinematic (same-origin → COEP require-corp / crossOriginIsolated preserved, DIF-02); six storyboard PNG posters alongside. components/wrap/WrapCinematic.tsx is a full-screen, skippable (Skip + Esc), reduced-motion-suppressed overlay that plays the current beat, loops age while confirming, and auto-dismisses after the token reveal. WrapPanel opens it on wrap submit (motion-gated) while the honest WrapStageIndicator + error row + on-done decrypt proof keep rendering beneath; skipping never touches the useWrap mutation. Preloader gained a video branch warming only the first beat. vitest 130/130 (112 + 18 new), check-types + next build (/wrap emitted) clean. Live "cinematic plays on a real wrap / reveal only at mined tx / crossOriginIsolated preserved" deferred to 07-UAT.md.
Last activity: 2026-07-08 — 07-01 wrap cinematic complete

Progress: [█████████░] 85% (phase 07: 1/4 plans)

## Performance Metrics

**Velocity:**

- Total plans completed: 16
- Average duration: — min
- Total execution time: 0.0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
| ----- | ----- | ----- | -------- |
| 01 | 3 | - | - |
| 02 | 4 | - | - |
| 03 | 3 | - | - |
| 04 | 2 | - | - |
| 05 | 2 | - | - |
| 06 | 2 | - | - |

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
| Phase 05 P02 | 6min | 3 tasks | 6 files |
| Phase 06 P01 | 11min | 3 tasks | 12 files |
| Phase 06 P02 | 12m | 2 tasks | 5 files |
| Phase 07 P01 | 6min | 3 tasks | 17 files |

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
- [Phase ?]: 06-02: unwrap success toast gated to stage===finalized effect (no optimistic success; T-06-06/UNW-02 preserved)
- [Phase ?]: 06-02: write hooks expose additive txHash for explorer links + real-tx success toasts without touching the SDK stage machine
- [07-01]: Wrap cinematic HONESTY is structural, not conventional — lib/cinematicBeats.ts encodes the reveal beats (pop/token) ONLY on stage==="done" in a per-stage Record, unit-locked by 18 RED→GREEN vitest cases; the WrapCinematic overlay consumes it, so it cannot show success before the mined receipt (T-07-01). Overlay reflects stage, never drives it; onSkip (Skip button + Esc) closes ONLY the overlay, never the useWrap mutation; prefers-reduced-motion suppresses it (plain WrapStageIndicator carries the flow). Six beats ffmpeg-compressed 720p H.264 crf28 +faststart -an to 0.29–0.86MB each, self-hosted under public/cinematic (same-origin → crossOriginIsolated intact, DIF-02); audio stripped (07-02 owns ambient). Preloader video branch warms only the first beat. Live proofs deferred to 07-UAT.md.

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

Last session: 2026-07-08T07:36:37.505Z
Stopped at: Completed 07-01-PLAN.md (signature wrap cinematic — honest reveal-gated engine + ffmpeg-compressed self-hosted beats + skippable tx-driven overlay; vitest 130/130, build clean; live proofs deferred to 07-UAT.md).
Resume file: None
