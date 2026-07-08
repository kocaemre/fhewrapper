---
phase: 07-polish-animation-submission
plan: 01
subsystem: ui
tags: [cinematic, wrap, useWrap, motion, ffmpeg, reveal-gate, coep, self-hosted-media, tdd, next-app-router]

# Dependency graph
requires:
  - phase: 04-faucet-wrap
    provides: "useWrap 4-stage machine (idle/approving/wrapping/confirming/done/error), WrapPanel, WrapStageIndicator"
  - phase: 02-registry-browse
    provides: "Preloader with the documented Phase-7 video/audio extension point; motion (installed)"
  - phase: 01-foundation-deploy-spike
    provides: "COOP/COEP require-corp headers (crossOriginIsolated) the self-hosted media must not break"
provides:
  - "lib/cinematicBeats.ts — pure beatsForStage/shouldShowOverlay/BEAT_MEDIA/BEAT_TITLES/BEAT_SUB engine with the honest reveal-gate (pop/token only at stage===done)"
  - "components/wrap/WrapCinematic.tsx — tx-driven, skippable (Skip+Esc), reduced-motion-safe full-screen overlay"
  - "public/cinematic/*.mp4 (6 compressed beats <0.9MB each) + posters/*.png (6 stills), same-origin"
  - "WrapPanel wired to open the cinematic on real wrap submit (motion-gated); Preloader warms the first beat via a new video branch"
affects: [07-02-audio, 07-UAT]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Cinematic OVERLAYS the honest flow — beatsForStage is the single source of truth; reveal beats (pop/token) are structurally unreachable until stage===done, so the overlay cannot lie about the tx"
    - "All cinematic media self-hosted under /public/cinematic (same-origin) so it loads under COEP require-corp without dropping crossOriginIsolated; ffmpeg 720p H.264 crf28 +faststart -an"
    - "Overlay reflects stage, never drives it; onSkip closes ONLY the overlay and never touches the useWrap mutation; prefers-reduced-motion suppresses it entirely (plain WrapStageIndicator carries the flow)"

key-files:
  created:
    - packages/nextjs/lib/cinematicBeats.ts
    - packages/nextjs/lib/cinematicBeats.test.ts
    - packages/nextjs/components/wrap/WrapCinematic.tsx
    - packages/nextjs/public/cinematic/01-fold.mp4
    - packages/nextjs/public/cinematic/02-insert.mp4
    - packages/nextjs/public/cinematic/03-seal.mp4
    - packages/nextjs/public/cinematic/04-age.mp4
    - packages/nextjs/public/cinematic/05-pop.mp4
    - packages/nextjs/public/cinematic/06-token.mp4
    - packages/nextjs/public/cinematic/posters/01-fold.png
    - packages/nextjs/public/cinematic/posters/02-insert.png
    - packages/nextjs/public/cinematic/posters/03-seal.png
    - packages/nextjs/public/cinematic/posters/04-age.png
    - packages/nextjs/public/cinematic/posters/05-pop.png
    - packages/nextjs/public/cinematic/posters/06-token.png
  modified:
    - packages/nextjs/components/wrap/WrapPanel.tsx
    - packages/nextjs/components/Preloader.tsx

decisions:
  - "Reveal-gate encoded as a per-stage Record in cinematicBeats (STAGE_BEATS) with pop/token ONLY on 'done' — locked by 18 vitest cases (RED→GREEN); the component consumes it, so honesty is structural not conventional"
  - "ffmpeg 720p (force_original_aspect_ratio=decrease, force_divisible_by=2) crf28 preset slow +faststart -an → each beat 0.29–0.86MB (well under the 6MB hard cap), audio stripped (07-02 owns ambient audio)"
  - "Posters are the design storyboard PNGs copied verbatim (~2.5–2.9MB) — used for the <video poster> and reduced-motion still; not preloaded (only the first beat video is warmed), so their weight does not gate the cover"
  - "age beat loops (loop attr) for the variable block-confirmation wait; multi-beat stages advance via onEnded; done auto-dismisses ~1.1s after the token reveal ends"
  - "Preloader case video resolves on canplaythrough OR error (never rejects), mirroring preloadImage — a slow/missing beat cannot trap the loading cover"

# Metrics
duration: 6min
completed: 2026-07-08
status: complete
---

# Phase 7 Plan 01: Wrap Cinematic (honest reveal-gate + self-hosted compressed beats) Summary

**The signature wrap cinematic: a full-screen, engraving-styled overlay that plays six ffmpeg-compressed self-hosted video beats driven by the REAL Phase-4 `useWrap` transaction stage, skippable (Skip + Esc), suppressed under `prefers-reduced-motion`, and structurally unable to show success before the tx is mined — the reveal beats (`pop`/`token`) are gated to `stage === "done"` and unit-locked RED→GREEN.**

## Performance

- **Duration:** 6 min
- **Tasks:** 3 (Task 1 was TDD: RED → GREEN)
- **Files:** 17 (15 created, 2 modified)

## Accomplishments

- **Honest beat engine (DIF-01):** `lib/cinematicBeats.ts` maps the `useWrap` `WrapStage` → ordered beats (`approving→[fold]`, `wrapping→[insert,seal]`, `confirming→[age]`, `done→[pop,token]`, `idle`/`error→[]`). The reveal beats `pop`/`token` are absent from every non-done stage — proven by 18 vitest cases written RED-first (import-fail RED committed before GREEN). This is the top-judging-axis honesty invariant made structural (threat T-07-01).
- **Compressed, self-hosted media (DIF-02):** the six RAW ~14–25MB Kling beats were ffmpeg-8.0.1-compressed to 720p H.264 (crf28, +faststart, audio stripped) — **0.29–0.86MB each**, far under the 6MB cap — and written to `public/cinematic/` (same-origin, so COEP `require-corp` / `crossOriginIsolated` is preserved). Six design storyboard PNGs copied to `public/cinematic/posters/` for the `<video poster>` + reduced-motion still.
- **The overlay:** `components/wrap/WrapCinematic.tsx` — a `role="dialog"` full-screen dark-cellar scrim that plays the current stage's beat (muted, playsInline, poster), crossfades beats via `motion`, loops `age` while confirming, advances multi-beat stages on `onEnded`, auto-dismisses after the `token` reveal, and is skippable via a Skip button + Escape. It renders nothing for `idle`/`error`.
- **Wired to the real tx:** `WrapPanel` opens the overlay on wrap submit (only when motion is allowed), passes the live `useWrap.stage`, and closes it on skip/Esc/error — while the honest `WrapStageIndicator`, inline `ExplorerTxLink`, typed error row, and on-done `PairCardDecrypt` proof all keep rendering beneath (the overlay never replaces or fakes them). Skipping never touches the `useWrap` mutation.
- **Warm first beat:** `Preloader` gained a `case "video"` branch (`canplaythrough`/`error`, never rejects) and warms ONLY `/cinematic/01-fold.mp4`, so the opening beat is instant without gating the cover on all six videos.

## Task Commits

1. **Task 1 (TDD RED):** failing reveal-gate tests for cinematicBeats — `6c454db` (test)
2. **Task 1 (TDD GREEN):** honest cinematic beat engine — `51c8bdd` (feat)
3. **Task 2:** compress + self-host 6 beats, build WrapCinematic overlay — `bc36eb9` (feat)
4. **Task 3:** wire cinematic into the real wrap flow + warm first beat — `c511e8b` (feat)

## Deviations from Plan

None affecting scope. Two mechanical build fixes:
- **[Rule 3 - Blocking]** The `preloadVideo` `@ts-expect-error` on `video.playsInline` was unused (current TS lib types `playsInline` on `HTMLVideoElement`), which `next build` treats as an error — removed the directive and set the property directly. Fixed during Task 3.
- Pre-commit `lint-staged` (prettier + eslint --fix) reordered the `motion/react` import in WrapPanel and reflowed a style object; no behavior change.

## Threat Mitigations Applied

- **T-07-01 (integrity):** reveal beats gated to `stage==="done"` in `STAGE_BEATS`, unit-locked; overlay never replaces `WrapStageIndicator`; skip does not touch the mutation.
- **T-07-02 (DoS/weight):** each beat under 0.9MB streamable + poster fallback; reduced-motion skips the overlay; Preloader warms only the first beat.
- **T-07-03 (isolation):** all beats + posters same-origin under `/public/cinematic`; `BEAT_MEDIA` paths asserted scheme-less absolute; build clean. Live `crossOriginIsolated` re-check deferred to 07-UAT.
- **T-07-04 (src injection):** `BEAT_MEDIA` entries are compile-time constants; no user input reaches a video `src`.

## Verification

- `npx vitest run` — **130 passed** (112 baseline + 18 new cinematicBeats cases), 17 files.
- `npm run check-types` — exit 0.
- `npm run build` — exit 0; `/wrap` route emitted (6.65 kB); self-hosted `/cinematic` media does not break the build.
- Grep gates: WrapPanel imports WrapCinematic AND still renders WrapStageIndicator; Preloader references `/cinematic/01-fold.mp4`.
- Media gates: 6 mp4 + 6 posters present; 0 mp4 over 6MB.

## Deferred to 07-UAT (live URL, per plan — no live checkpoint here)

Cinematic plays on a real wrap; reveal only at the mined tx; Skip/Esc works; reduced-motion falls back to the stage indicator; `crossOriginIsolated === true` preserved with the media loaded.

## Self-Check: PASSED

All 15 created files present on disk (engine + test + overlay + 6 mp4 + 6 posters); both modified files updated. All 4 task commits (`6c454db`, `51c8bdd`, `bc36eb9`, `c511e8b`) present in git history. Gates: vitest 130/130, check-types exit 0, build exit 0 (`/wrap` emitted), every mp4 under 6MB.

---
*Phase: 07-polish-animation-submission*
*Completed: 2026-07-08*
