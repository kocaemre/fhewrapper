# Phase 7: Polish + Animation Differentiator + Submission - Context

**Gathered:** 2026-07-08
**Status:** Ready for planning
**Mode:** MVP (discuss skipped, floor-it; user asleep; orchestrator-set from ROADMAP + design + memory assets)

<domain>
## Phase Boundary

The signature bottle cinematic + full submission package land — the wedge to place 1st — layered on ONLY after the wrap→decrypt→unwrap loop is verified correct (Phases 2-6, done). All media self-hosted in `/public` to survive COEP `require-corp`. Covers DIF-01..05, SUB-01, SUB-02, SUB-04, SUB-05. NO new @zama-fhe SDK — this is media integration + polish + docs.
</domain>

<decisions>
## Implementation Decisions

### A. Wrap cinematic (DIF-01) — AUTONOMOUS
- The 6-beat storyboard (fold → insert → seal → age → pop → token) is authored as engraving assets: 6 MP4s in `.planning/design/assets/video/` (01-fold 02-insert 03-seal 04-age 05-pop 06-token, Kling-generated, RAW ~15-25MB each) + 6 PNG storyboard frames. COMPRESS the videos (H.264 mp4 + optionally WebM, target small/streamable — use ffmpeg; if ffmpeg absent, fall back to the storyboard PNGs + motion/CSS, or a poster+lightweight loop) and SELF-HOST in `packages/nextjs/public/` (COEP require-corp → same-origin only, no cross-origin hotlink).
- Drive the cinematic from the REAL wrap tx lifecycle (Phase-4 `useWrap` callbacks: onApprovalSubmitted → onShieldSubmitted → receipt map to the beats), and make it SKIPPABLE (a skip control; respect prefers-reduced-motion → static poster). It must NOT block or fake the tx — the cinematic overlays the honest 4-stage, never replaces the real result.

### B. Ambient audio (DIF-03) — AUTONOMOUS
- `cellar-ambient.mp3` (45s loop, in `.planning/design/assets/audio/`) via `howler` — AUTOPLAY IS BLOCKED until a user gesture, so unlock on first interaction, loop, with a visible mute/unmute toggle (default respectful — consider default-muted). Self-hosted in `/public`.

### C. Media self-hosting + COEP (DIF-02) — AUTONOMOUS
- ALL fal.ai/ElevenLabs assets live in `packages/nextjs/public/` (same-origin) and must still load under the live COOP/COEP `require-corp` headers (Phase 1). No cross-origin `<video>`/`<audio>`/CDN. Verify the live crossOriginIsolated is not broken by the media.

### D. Reusable hooks + polish (DIF-04/05, SUB-02) — AUTONOMOUS
- The reusable hooks already exist and are typed: `useRegistryPairs` (registry), `useWrap`, `useUnwrap`, `useUserDecrypt`. Ensure they are cleanly exported / well-typed as the public API (SC3). Apply the final visual polish pass across the app (the Cellar Registry look is largely in place; tighten remaining rough edges). Keep tests green + build clean.

### E. README + submission docs (SUB-04) — AUTONOMOUS (docs only)
- Complete the README: live URL (https://fhewrapper-nextjs.vercel.app/), supported networks (Sepolia / 11155111), how the registry is sourced (onchain Wrappers Registry + hybrid local config), how to add a pair (already documented Phase 2 — link/extend), and deploy scripts / deploy guide (GitHub→Vercel import, Root Directory packages/nextjs, npm, NEXT_PUBLIC_IPFS_BUILD unset). Document the SDK-3.0.0 pin + COOP/COEP requirement.

### F. DEFERRED to the user (outward / human — recorded in 07-UAT.md, NOT done autonomously)
- **SUB-01 flip the private repo to PUBLIC** before submitting — an outward, hard-to-reverse reveal; the USER does this when ready.
- **SUB-05 the 3-minute REAL-PERSON pitch video** (bounty requires a real person — no AI voice/video) — USER records it.
- **The X thread / article** publication — USER posts it.
- All live-URL manual verification (cinematic plays on real wrap, audio unlocks, media loads under COEP, full loop) → the single end-of-project UAT session.
</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets (Phases 1-6)
- The full app: registry browse (Phase 2, Cellar look + preloader + side motifs + themed connect), decrypt (Phase 3), wrap (Phase 4), unwrap (Phase 5), unified error/status system + toasts + explorer links (Phase 6).
- Hooks: `useRegistryPairs`, `useWrap`, `useUnwrap`, `useUserDecrypt`, `useFaucet` — the clean public API.
- Media source: `.planning/design/assets/` — 6 wrap videos (`video/`), 6 storyboard PNGs, hero/bottle/faucet/icons/motifs PNGs, `audio/cellar-ambient.mp3`. Design source `.dc.html` has the 6-beat cinematic treatment.
- Libs per CLAUDE.md: `motion` (installed Phase 2), `howler` (may need install — verify), `gsap` optional. Preloader (Phase 2) already has a video/audio extension point.
- Deploy live: https://fhewrapper-nextjs.vercel.app/ ; repo github.com/kocaemre/fhewrapper (PRIVATE); Vercel via GitHub-import; COOP/COEP require-corp live; SDK EXACT 3.0.0; vitest 112 tests.

### Established Patterns
- All media self-hosted under `/public` (COEP). ffmpeg for compression (verify availability). Cellar engraving theme.

### Integration Points
- Cinematic overlays the Phase-4 wrap flow via useWrap callbacks; audio is a global gesture-unlocked toggle; README at repo root (extend Phase-2's add-a-pair section).
</code_context>

<specifics>
## Specific Ideas
- The cinematic is the DIFFERENTIATOR (place 1st) but must be layered on the VERIFIED loop, tx-driven, skippable, reduced-motion-safe — never faking the result.
- Videos are RAW and large → MUST compress before shipping (bundle + COEP).
- Pitch video + repo-public + social are the user's to do (deferred).
</specifics>

<deferred>
## Deferred Ideas
- SUB-01 repo→public, SUB-05 real-person pitch video, X thread/article → USER (07-UAT.md). All live-URL manual verification → end-of-project UAT session.
</deferred>
