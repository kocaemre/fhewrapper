---
phase: 7
slug: polish-animation-submission
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-08
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for the DIFFERENTIATOR + SUBMISSION phase. This is media integration + polish +
> docs on top of the VERIFIED wrap→decrypt→unwrap loop (Phases 2-6) — NO new `@zama-fhe` SDK surface. The one
> correctness-critical PURE unit is the cinematic beat engine (`cinematicBeats`): its reveal-gate invariant —
> the success beats (pop/token) are structurally unreachable until `stage === "done"` — is what makes the
> animation HONEST (it cannot show success before the wrap tx is mined) and is unit-tested RED-first. Everything
> else is INTEGRATION (check-types + build + grep affordance gates) in-phase: the tx-driven overlay wiring, the
> Howler gesture-unlock audio, the hooks barrel, and the reveal/registry polish are UI/SDK/browser-owned. The
> live proofs — cinematic plays on a real wrap and only reveals at the mined tx, audio unlocks on gesture, all
> `/cinematic` + `/audio` media load under COEP `require-corp` with `crossOriginIsolated === true`, and the full
> loop completes — are deferred to a single end-of-project `07-UAT.md` session (time-box / floor-it directive).
> The outward/human items (repo public, 3-min real-person pitch video, X thread) are the user's, also in 07-UAT.
> Source: 07-CONTEXT.md.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.10 (installed, configured Phase 2/3) — no new test dependency |
| **Config file** | `packages/nextjs/vitest.config.ts` |
| **Quick run command** | `cd packages/nextjs && npx vitest run <file>` |
| **Full suite command** | `cd packages/nextjs && npx vitest run` |
| **Type/build gates** | `npm run check-types` · `npm run build` |
| **Media tooling** | ffmpeg 8.0.1 (present) for beat-video compression; howler 2.2.4 (exact-pinned, CLAUDE.md-mandated) for audio |
| **Estimated runtime** | units <5s; `npm run build` ~60–90s; live cinematic/audio/COEP + full-loop proof = manual on the Vercel URL |

---

## Sampling Rate

- **After every task commit:** `npx vitest run <changed .test.ts>` (cinematicBeats) + `npm run check-types`.
- **After every plan wave:** full `npx vitest run` + `npm run build`; plus the per-plan grep affordance gates
  (self-hosted media present + under 6MB; howler exact-pinned; AmbientAudio same-origin src; hooks barrel
  resolves; decrypt cipher-blur/reveal-num + registry badge/copy/search wired; README + 07-UAT gates).
- **Before `/gsd-verify-work`:** full unit suite green (112 prior locks + new cinematicBeats units) + `next build`
  clean (`/wrap` emitted, self-hosted `/cinematic` + `/audio` present) + the deferred `07-UAT.md` live pass.
- **Max feedback latency:** ~90s (units + build); the live cinematic-honesty / audio-unlock / COEP-isolation /
  full-loop checks are manual gates (deferred to the end-of-project UAT session).

---

## Per-Requirement Verification Map

| Req ID | Behavior | Test Type | Automated Command | File Exists | Status |
|--------|----------|-----------|-------------------|-------------|--------|
| DIF-01 | Beat engine maps each `WrapStage` to the correct ordered beats | unit (pure) | `npx vitest run lib/cinematicBeats.test.ts` | ❌ W0 | ⬜ pending |
| DIF-01 | HONEST reveal gate — pop/token unreachable for any non-done stage | unit (pure) | `npx vitest run lib/cinematicBeats.test.ts -t "reveal"` | ❌ W0 | ⬜ pending |
| DIF-01 | `shouldShowOverlay` false under reduced-motion and for idle/error | unit (pure) | `npx vitest run lib/cinematicBeats.test.ts -t "overlay"` | ❌ W0 | ⬜ pending |
| DIF-01 | WrapCinematic wired to `useWrap.stage`, overlays (never replaces) the honest WrapStageIndicator | integration (grep+build) | `grep -q WrapCinematic components/wrap/WrapPanel.tsx && grep -q WrapStageIndicator components/wrap/WrapPanel.tsx && npm run build` | ✅ (07-01 W?) | ⬜ pending |
| DIF-01 | Cinematic plays on a real wrap, reveals only at the mined tx, is skippable + reduced-motion-safe | manual (live wallet/relayer) | manual on live URL | ❌ manual | ⬜ pending |
| DIF-02 | 6 beat videos compressed + self-hosted under /public/cinematic, each mp4 under 6MB | integration (fs) | `test $(ls public/cinematic/0*.mp4 | wc -l) -eq 6 && test $(find public/cinematic -name '*.mp4' -size +6M | wc -l) -eq 0` | ❌ W0 | ⬜ pending |
| DIF-02 | Ambient audio self-hosted same-origin; howler exact-pinned 2.2.4 | integration (fs+pkg) | `test -f public/audio/cellar-ambient.mp3 && node -e "process.exit(require('./package.json').dependencies.howler==='2.2.4'?0:1)"` | ❌ W0 | ⬜ pending |
| DIF-02 | All /cinematic + /audio media load under COEP require-corp; crossOriginIsolated preserved | manual (live) | manual on live URL | ❌ manual | ⬜ pending |
| DIF-03 | Decrypt blur→reveal present on /decrypt panel + registry per-card, reduced-motion fallback | integration (grep+build) | `grep -q cipher-blur components/decrypt/DecryptStateBox.tsx && grep -q reveal-num components/decrypt/DecryptStateBox.tsx && npm run build` | ✅ (Phase 3) | ⬜ pending |
| DIF-04 | Registry search/filter + valid/revoked badges + copy buttons wired into PairCard | integration (grep) | `grep -q PairBadge components/registry/PairCard.tsx && grep -q AddressCopyButton components/registry/PairCard.tsx && grep -qi search components/registry/RegistryToolbar.tsx` | ✅ (Phase 2) | ⬜ pending |
| DIF-05 | Public hooks barrel re-exports useRegistry/useWrap/useUnwrap/useUserDecrypt + types | integration (type) | `grep -q useRegistry hooks/index.ts && npm run check-types` | ❌ W0 | ⬜ pending |
| SUB-02 | README covers live URL, Sepolia 11155111, registry sourcing, add-a-pair, deploy, COOP/COEP, SDK pin | integration (grep) | `grep -q fhewrapper-nextjs.vercel.app README.md && grep -q 11155111 README.md && grep -qi require-corp README.md && grep -q packages/nextjs README.md` | ❌ W0 | ⬜ pending |
| SUB-01 | Repo flipped PUBLIC (behind a committed-secret pre-check) | manual (user) | 07-UAT.md (deferred) | ❌ manual | ⬜ pending |
| SUB-04 | 3-minute real-person pitch video recorded (no AI voice/video) | manual (user) | 07-UAT.md (deferred) | ❌ manual | ⬜ pending |
| SUB-05 | X thread / article published | manual (user) | 07-UAT.md (deferred) | ❌ manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `lib/cinematicBeats.ts` + `.test.ts` — the pure stage→beats engine with the HONEST reveal-gate (pop/token
      unreachable until `stage === "done"`) + `shouldShowOverlay` (reduced-motion + idle/error suppression) +
      `BEAT_MEDIA` same-origin path assertions — RED-first (07-01 Task 1).

No other Wave 0 unit is required: the audio unlock, the overlay wiring, the hooks barrel, and the reveal/registry
polish are integration surfaces proven by check-types + build + grep affordance gates, then by the live 07-UAT.

---

## Why not more automated coverage

The wrap `useShield` tx path, the video `<video>` playback + `onEnded` sequencing, the Howler autoplay-unlock on a
real user gesture, and the browser's cross-origin-isolation enforcement are all wallet-, browser-, and
relayer-owned — mocking them would only test the mock. The one claim that MUST be provable without a browser —
that the cinematic cannot show success before the transaction is mined — is captured PURELY in `cinematicBeats`
(the reveal-gate) and unit-locked, so DIF-01's honesty is guaranteed in-phase. DIF-03 and DIF-04 were delivered
in Phases 2-3 and are re-verified by grep + build rather than rebuilt. The remaining claims — the cinematic plays
on a real wrap and reveals only at the mined tx, the audio unlocks on gesture and loops, every `/cinematic` +
`/audio` asset loads under COEP `require-corp` with `crossOriginIsolated === true`, and the full wrap→decrypt→
unwrap loop still completes — are inherently live and are proven once on the deployed URL in `07-UAT.md`, alongside
the human/outward submission items (repo public, real-person pitch video, X thread).
