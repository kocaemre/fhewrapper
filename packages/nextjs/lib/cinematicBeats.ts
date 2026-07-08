import type { WrapStage } from "~~/hooks/useWrap";

/**
 * Wrap cinematic beat engine (DIF-01) — the PURE, unit-tested source of truth
 * that maps the Phase-4 `useWrap` transaction lifecycle to the six engraving
 * beats a tx-driven overlay may play. No React, no `window`, no side effects:
 * this file is fully testable and is the single place the honesty invariant
 * lives (07-CONTEXT decision A / threat T-07-01).
 *
 * The cinematic OVERLAYS the honest 4-stage `WrapStageIndicator` — it never
 * replaces or fakes the onchain result. The correctness wedge is the REVEAL
 * GATE: the "it worked" beats (`pop`, `token`) are only ever returned for
 * `stage === "done"` (the mined receipt), so the component consuming this map
 * CANNOT show success before the tx is actually mined — even by mistake.
 *
 * Beat ids match the six self-hosted video filenames under `/public/cinematic`:
 * fold → insert → seal → age → pop → token.
 */

/** The six engraving beats, in narrative order. */
export type BeatId = "fold" | "insert" | "seal" | "age" | "pop" | "token";

/** The reveal ("it worked") beats — structurally gated to `stage === "done"`. */
export const REVEAL_BEATS: readonly BeatId[] = ["pop", "token"] as const;

/**
 * The ordered beats an overlay may play at a given wrap stage.
 *
 * - idle    → []                (nothing before a wrap starts)
 * - approving→ ["fold"]         (folding the contract while the allowance signs)
 * - wrapping → ["insert","seal"](into the vessel, then waxed + corked)
 * - confirming→ ["age"]         (aging while the block confirms — component loops it)
 * - done    → ["pop","token"]   (THE REVEAL — only reachable once mined)
 * - error   → []                (yield to the honest typed error row below)
 *
 * The `pop`/`token` reveal beats appear for NO stage other than "done". This is
 * the honest-overlay invariant, locked by cinematicBeats.test.ts.
 */
const STAGE_BEATS: Record<WrapStage, readonly BeatId[]> = {
  idle: [],
  approving: ["fold"],
  wrapping: ["insert", "seal"],
  confirming: ["age"],
  done: ["pop", "token"],
  error: [],
};

/** Return a fresh, ordered beat list for a wrap stage (never mutated by callers). */
export function beatsForStage(stage: WrapStage): BeatId[] {
  return [...STAGE_BEATS[stage]];
}

/**
 * Whether the full-screen cinematic overlay should render at all.
 *
 * True only for the active tx stages (approving/wrapping/confirming/done) AND
 * only when `reducedMotion` is false. `idle`/`error` never show the overlay, and
 * `prefers-reduced-motion` suppresses it entirely so the plain
 * `WrapStageIndicator` carries the flow (DIF-01 reduced-motion path).
 */
export function shouldShowOverlay(stage: WrapStage, reducedMotion: boolean): boolean {
  if (reducedMotion) return false;
  return stage === "approving" || stage === "wrapping" || stage === "confirming" || stage === "done";
}

/** A beat's self-hosted, same-origin media (video + poster still). */
export interface BeatMedia {
  /** Scheme-less absolute path to the compressed H.264 mp4 under /cinematic. */
  video: string;
  /** Scheme-less absolute path to the poster PNG under /cinematic/posters. */
  poster: string;
}

/**
 * Beat → self-hosted media map. Every path is a scheme-less absolute path under
 * `/cinematic` (served same-origin from `packages/nextjs/public`), so the media
 * loads under the live COOP/COEP `require-corp` isolation without dropping
 * `crossOriginIsolated` — no host, no scheme, no CDN (DIF-02 / threat T-07-03).
 * These are compile-time constants — no user input ever reaches a video src
 * (threat T-07-04).
 */
export const BEAT_MEDIA: Record<BeatId, BeatMedia> = {
  fold: { video: "/cinematic/01-fold.mp4", poster: "/cinematic/posters/01-fold.png" },
  insert: { video: "/cinematic/02-insert.mp4", poster: "/cinematic/posters/02-insert.png" },
  seal: { video: "/cinematic/03-seal.mp4", poster: "/cinematic/posters/03-seal.png" },
  age: { video: "/cinematic/04-age.mp4", poster: "/cinematic/posters/04-age.png" },
  pop: { video: "/cinematic/05-pop.mp4", poster: "/cinematic/posters/05-pop.png" },
  token: { video: "/cinematic/06-token.mp4", poster: "/cinematic/posters/06-token.png" },
};

/** The design's narrative title for each beat (rendered from data, not hardcoded in JSX). */
export const BEAT_TITLES: Record<BeatId, string> = {
  fold: "Sealing the contract",
  insert: "Into the vessel",
  seal: "Waxed and corked",
  age: "Aging in the cellar",
  pop: "Uncorked",
  token: "Transformed",
};

/** The design's supporting subtitle for each beat. */
export const BEAT_SUB: Record<BeatId, string> = {
  fold: "Signing approve() on the public ERC-20",
  insert: "Locking the token into the confidential wrapper",
  seal: "wrap() encrypts the balance on-chain",
  age: "Waiting for block confirmation",
  pop: "The receipt is mined — it worked",
  token: "Your balance is now confidential ciphertext",
};
