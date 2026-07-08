"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { WrapStage } from "~~/hooks/useWrap";
import { BEAT_MEDIA, BEAT_SUB, BEAT_TITLES, type BeatId, beatsForStage } from "~~/lib/cinematicBeats";

const MONO = "var(--font-jetbrains-mono), monospace";
const SERIF = "var(--font-gelasio), Georgia, serif";

/** Full ordered beat sequence — drives the 6-dot progress rail. */
const ALL_BEATS: readonly BeatId[] = ["fold", "insert", "seal", "age", "pop", "token"] as const;

/**
 * Wrap cinematic overlay (DIF-01) — a full-screen, engraving-styled dialog that
 * plays the six self-hosted video beats driven by the REAL Phase-4 `useWrap`
 * transaction `stage`. It OVERLAYS the honest `WrapStageIndicator` beneath it and
 * never blocks, replaces, or fakes the onchain result:
 *
 *  - The visible beat is chosen purely from `beatsForStage(stage)` — the reveal
 *    beats (`pop`, `token`) are structurally unreachable until `stage === "done"`
 *    (the mined receipt), so this overlay CANNOT show success early (T-07-01).
 *  - It never DRIVES the stage; the parent passes the live `stage` in. Skipping
 *    (Skip control or Esc) calls `onSkip`, which closes ONLY the overlay — the
 *    real approve/wrap mutation keeps running underneath, unchanged (T-07-01).
 *  - `idle`/`error` yield no beats, so the overlay renders nothing and the honest
 *    typed error row below stays visible.
 *  - The parent only mounts this when motion is allowed (`shouldShowOverlay`);
 *    `prefers-reduced-motion` suppresses it entirely (DIF-01).
 *
 * All media is same-origin under `/cinematic` (BEAT_MEDIA), so it loads under the
 * live COOP/COEP `require-corp` isolation without breaking `crossOriginIsolated`
 * (DIF-02 / T-07-03).
 */
export function WrapCinematic({ stage, onSkip }: { stage: WrapStage; onSkip: () => void }) {
  const beats = beatsForStage(stage);
  const [idx, setIdx] = useState(0);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Each stage plays its own ordered beat list from the top.
  useEffect(() => {
    setIdx(0);
  }, [stage]);

  // Esc closes ONLY the overlay (never touches the useWrap mutation).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onSkip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSkip]);

  // Clear any pending auto-close timer on unmount.
  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  // No beats for this stage (idle/error) → render nothing; the honest indicator
  // and error row beneath are the source of truth.
  if (beats.length === 0) return null;

  const beat = beats[Math.min(idx, beats.length - 1)];
  const media = BEAT_MEDIA[beat];
  // The `age` beat loops for the (variable) block-confirmation wait; multi-beat
  // stages advance on `onEnded`.
  const looping = stage === "confirming";
  const globalPos = ALL_BEATS.indexOf(beat);

  function handleEnded() {
    if (looping) return; // loops via the `loop` attribute; onEnded won't fire
    if (idx < beats.length - 1) {
      setIdx(i => i + 1);
      return;
    }
    // Last beat of the stage finished. On `done`, the token reveal has played —
    // auto-dismiss the overlay shortly after (the honest result stays below).
    if (stage === "done") {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      closeTimer.current = setTimeout(onSkip, 1100);
    }
  }

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Wrap cinematic"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 22,
        // Dark cellar scrim.
        background: "rgba(10, 8, 6, 0.94)",
        backgroundImage: "radial-gradient(120% 120% at 50% 0%, rgba(40,30,22,0.6) 0%, rgba(10,8,6,0.96) 60%)",
        color: "#f4ece0",
      }}
    >
      {/* Skip control (top-right) — closes ONLY the overlay. */}
      <button
        type="button"
        onClick={onSkip}
        style={{
          position: "absolute",
          top: 22,
          right: 22,
          border: "1.5px solid rgba(244,236,224,0.35)",
          background: "transparent",
          color: "#f4ece0",
          padding: "8px 16px",
          fontFamily: MONO,
          fontSize: 12,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Skip ✕ <span style={{ opacity: 0.6 }}>Esc</span>
      </button>

      {/* The beat video — muted, playsInline, poster set; crossfades between beats. */}
      <div
        style={{
          position: "relative",
          width: "min(88vw, 560px)",
          aspectRatio: "1 / 1",
          border: "2px solid rgba(244,236,224,0.22)",
          background: "#0a0806",
          overflow: "hidden",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        }}
      >
        <AnimatePresence mode="popLayout">
          <motion.video
            key={beat}
            src={media.video}
            poster={media.poster}
            autoPlay
            muted
            playsInline
            loop={looping}
            onEnded={handleEnded}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        </AnimatePresence>
      </div>

      {/* Narrative title + subtitle (rendered from BEAT_TITLES/BEAT_SUB data). */}
      <div style={{ textAlign: "center", padding: "0 16px", maxWidth: 560 }}>
        <div
          style={{
            fontFamily: SERIF,
            fontWeight: 600,
            fontSize: "clamp(22px, 4.5vw, 34px)",
            lineHeight: 1.15,
            color: "#f4ece0",
          }}
        >
          {BEAT_TITLES[beat]}
        </div>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 12.5,
            letterSpacing: "0.06em",
            color: "rgba(244,236,224,0.62)",
            marginTop: 8,
          }}
        >
          {BEAT_SUB[beat]}
        </div>
      </div>

      {/* 6-dot progress rail — the beat's position in the full sequence. */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }} aria-hidden="true">
        {ALL_BEATS.map((b, i) => {
          const isActive = i === globalPos;
          const isDone = i < globalPos;
          return (
            <span
              key={b}
              style={{
                width: isActive ? 11 : 8,
                height: isActive ? 11 : 8,
                borderRadius: "50%",
                background: isActive ? "#c0392b" : isDone ? "rgba(244,236,224,0.7)" : "rgba(244,236,224,0.22)",
                transition: "all 0.3s ease",
              }}
            />
          );
        })}
      </div>
    </motion.div>
  );
}
