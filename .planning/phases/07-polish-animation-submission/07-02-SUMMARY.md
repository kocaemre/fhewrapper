---
phase: 07-polish-animation-submission
plan: 02
subsystem: ambient-audio
tags: [audio, howler, header, coep, dif-02]
status: complete
requires:
  - "Header.tsx site-wide nav shell (existing)"
  - "COEP require-corp isolation set in next.config.ts (Phase 1)"
provides:
  - "AmbientAudio: opt-in, default-muted, gesture-unlocked looping cellar audio control"
  - "Self-hosted same-origin /audio/cellar-ambient.mp3"
affects:
  - "packages/nextjs/components/Header.tsx (adds header-mounted audio toggle)"
tech-stack:
  added:
    - "howler 2.2.4 (exact) — CLAUDE.md-mandated audio lib"
    - "@types/howler 2.2.13 (exact, dev)"
  patterns:
    - "SSR-safe lazy Howl construction in a ref (never at module scope)"
    - "Default-muted opt-in playback; first-gesture prime under browser autoplay policy"
key-files:
  created:
    - "packages/nextjs/components/audio/AmbientAudio.tsx"
    - "packages/nextjs/public/audio/cellar-ambient.mp3"
  modified:
    - "packages/nextjs/components/Header.tsx"
    - "packages/nextjs/package.json"
    - "package-lock.json"
decisions:
  - "Default state is MUTED (respectful, no surprise audio for judges); unmute is the single opt-in entry point"
  - "Mute pauses the Howl (stops background decode) rather than only zeroing volume"
  - "Self-host the mp3 same-origin under /public/audio — a cross-origin src would silently break crossOriginIsolated under COEP require-corp"
  - "Toggle mounted only in the Header (never in the Preloader) so audio can never autoplay"
metrics:
  duration: "2m"
  completed: "2026-07-08"
  tasks: 2
  files_changed: 5
status_note: "check-types + build clean; 130 vitest tests green; crossOriginIsolated preserved (same-origin audio)"
---

# Phase 7 Plan 02: Ambient Cellar Audio Summary

Opt-in, default-muted ambient cellar audio (DIF-02) via an exact-pinned `howler`
loop, a self-hosted same-origin mp3, and a header-mounted mute/unmute toggle that
never autoplays and keeps the COEP `require-corp` isolation intact.

## What Was Built

- **`howler` 2.2.4** exact-pinned (+ `@types/howler` 2.2.13 dev), the CLAUDE.md-mandated
  audio library. Installed with `--save-exact`, matching the repo's Zama-SDK pin discipline.
- **`public/audio/cellar-ambient.mp3`** — the 45s ambient loop (~720 KB) copied from
  `.planning/design/assets/audio/`, self-hosted same-origin (required under COEP
  `require-corp`; no CDN hotlink).
- **`components/audio/AmbientAudio.tsx`** — a `"use client"` control that:
  - Lazily constructs a `Howl` (`loop: true`, `html5: true`) in a ref, never at module
    scope → SSR-safe.
  - Defaults to a respectful **muted** state; nothing plays at mount.
  - Attaches a one-time `pointerdown`/`keydown` listener that primes the audio context on
    the first user gesture (browser autoplay policy) without producing sound.
  - On unmute, starts/resumes the loop; on mute, pauses it. The button glyph + label
    reflect true state (`aria-pressed`, `aria-label`).
  - Unloads the Howl and removes listeners on unmount.
- **Header mount** — the toggle sits left of the RainbowKit connect cluster in
  `navbar-end`, present on every route, in the Cellar idiom (mono label + speaker glyph,
  `--red`/`--muted` vars). The connect button/address pill stay pinned right.

## Task Commits

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 | Install howler, self-host loop, build AmbientAudio | f8b9f9b |
| 2 | Mount default-muted toggle site-wide in header | 9297f76 |

## Verification

- `howler` exact-pinned `2.2.4` in `package.json` (node check passed).
- `public/audio/cellar-ambient.mp3` present (self-hosted, same-origin).
- Grep gates: AmbientAudio references the `/audio/cellar-ambient.mp3` path; Header mounts AmbientAudio.
- `npm run check-types` clean; `npx vitest run` → **130 passed (17 files)**; `npm run build` clean (all 8 routes static).
- No cross-origin audio source introduced → `crossOriginIsolated` preserved. Cinematic (07-01) and wrap flow untouched.

## Deviations from Plan

None - plan executed exactly as written. (Pre-commit lint-staged reordered the
`AmbientAudio` import in `Header.tsx`; cosmetic, no behavior change.)

## Deferred to 07-UAT (live URL)

- Audio does NOT autoplay; unlocks + loops on unmute after a user gesture; toggle reflects state.
- `crossOriginIsolated === true` re-checked live with the audio present.

## Self-Check: PASSED
